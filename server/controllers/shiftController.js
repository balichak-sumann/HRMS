const { Pool } = require('pg');
const { sendShiftAssignmentEmail } = require('../services/emailService');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let shiftSchemaEnsured = false;

const ensureShiftSchema = async () => {
    if (shiftSchemaEnsured) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS shifts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT UNIQUE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS employee_shift_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
            effective_from DATE NOT NULL,
            effective_to DATE,
            assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee_dates
            ON employee_shift_assignments(employee_id, effective_from, effective_to);

        CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift
            ON employee_shift_assignments(shift_id);
    `);

    shiftSchemaEnsured = true;
};

const parseDate = (value, fieldName) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        throw new Error(`${fieldName} must be in YYYY-MM-DD format`);
    }
    return String(value);
};

const parseTime = (value, fieldName) => {
    if (!value || !/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(String(value))) {
        throw new Error(`${fieldName} must be in HH:MM or HH:MM:SS format`);
    }
    return String(value);
};

const getActorEmployeeId = async (req) => {
    if (req.user?.employee_uuid) return req.user.employee_uuid;

    if (req.user?.email) {
        const result = await pool.query('SELECT id FROM employees WHERE email = $1 LIMIT 1', [req.user.email]);
        if (result.rows[0]) return result.rows[0].id;
    }

    return null;
};

const isShiftAssignmentEmailEnabled = () => String(process.env.SHIFT_ASSIGNMENT_EMAIL_NOTIFICATIONS || 'false').toLowerCase() === 'true';

const notifyShiftAssignment = async ({ employee, shift, effectiveFrom, io }) => {
    if (!employee?.id || !shift?.name) return;

    const shiftWindow = `${String(shift.start_time || '').slice(0, 5)} - ${String(shift.end_time || '').slice(0, 5)}`;
    const title = 'Shift Assigned';
    const message = `You have been assigned to shift ${shift.name} (${shiftWindow}) effective from ${effectiveFrom}.`;

    try {
        const profileRes = await pool.query(
            `SELECT p.id AS profile_id
             FROM employees e
             LEFT JOIN profiles p
               ON LOWER(TRIM(p.email)) = LOWER(TRIM(e.email))
               OR (
                    p.employee_id IS NOT NULL
                AND e.employee_id IS NOT NULL
                AND LOWER(TRIM(p.employee_id)) = LOWER(TRIM(e.employee_id))
               )
             WHERE e.id = $1
             LIMIT 1`,
            [employee.id]
        );

        const profileId = profileRes.rows[0]?.profile_id || null;
        if (profileId) {
            const notificationRes = await pool.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [profileId, title, message, 'shift']
            );

            if (io) {
                const payload = notificationRes.rows[0];
                io.to(profileId).emit('notification_created', payload);
                io.to(`employee_${employee.id}`).emit('notification_created', payload);
                io.to(String(employee.id)).emit('notification_created', payload);
            }
        } else if (io) {
            io.to(`employee_${employee.id}`).emit('notification_created', {
                title,
                message,
                type: 'shift',
                created_at: new Date().toISOString(),
                targetUserId: employee.id,
            });
        }
    } catch (notifyErr) {
        console.warn('[Shifts] In-app notification failed:', notifyErr.message);
    }

    if (isShiftAssignmentEmailEnabled() && employee.email) {
        sendShiftAssignmentEmail({
            to: employee.email,
            name: employee.full_name || 'Employee',
            shiftName: shift.name,
            startTime: shift.start_time,
            endTime: shift.end_time,
            effectiveFrom,
        }).catch((emailErr) => {
            console.warn('[Shifts] Shift assignment email failed:', emailErr.message);
        });
    }
};

const createShift = async (req, res) => {
    const { name, start_time, end_time } = req.body;

    try {
        await ensureShiftSchema();

        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'Shift name is required' });
        }

        const cleanStart = parseTime(start_time, 'start_time');
        const cleanEnd = parseTime(end_time, 'end_time');

        const result = await pool.query(
            `INSERT INTO shifts (name, start_time, end_time, updated_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING *`,
            [String(name).trim(), cleanStart, cleanEnd]
        );

        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Shift name already exists' });
        }
        if (err.message && (err.message.includes('start_time') || err.message.includes('end_time'))) {
            return res.status(400).json({ error: err.message });
        }
        console.error('createShift error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getShifts = async (req, res) => {
    try {
        await ensureShiftSchema();
        const result = await pool.query('SELECT * FROM shifts ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('getShifts error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const assignShiftToEmployee = async (req, res) => {
    const { employee_id, shift_id, effective_from } = req.body;
    const client = await pool.connect();

    try {
        await ensureShiftSchema();

        if (!employee_id || !shift_id || !effective_from) {
            return res.status(400).json({ error: 'employee_id, shift_id and effective_from are required' });
        }

        const effectiveFrom = parseDate(effective_from, 'effective_from');
        const effectiveTo = req.body.effective_to ? parseDate(req.body.effective_to, 'effective_to') : null;
        const actorId = await getActorEmployeeId(req);

        await client.query('BEGIN');

        const employee = await client.query('SELECT id, full_name, email, employee_id FROM employees WHERE id = $1', [employee_id]);
        if (employee.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Employee not found' });
        }

        const shift = await client.query('SELECT id, name, start_time, end_time FROM shifts WHERE id = $1', [shift_id]);
        if (shift.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Shift not found' });
        }

        // --- Robust Date Interval Splitting ---
        if (effectiveTo) {
            // BOUNDED override: cleanly slice the existing schedule into 3 segments

            // 1. Find what shift was active and its original start date
            const beforeRes = await client.query(
                `SELECT shift_id, effective_from FROM employee_shift_assignments
                 WHERE employee_id = $1
                   AND effective_from <= $2::date
                   AND (effective_to IS NULL OR effective_to >= $2::date)
                 ORDER BY effective_from DESC, created_at DESC
                 LIMIT 1`,
                [employee_id, effectiveFrom]
            );
            const previousShiftId = beforeRes.rows[0]?.shift_id || null;
            const previousStart = beforeRes.rows[0]?.effective_from || null;

            // 2. Delete ALL assignments that overlap with the override range
            await client.query(
                `DELETE FROM employee_shift_assignments
                 WHERE employee_id = $1
                   AND effective_from <= $2::date
                   AND (effective_to IS NULL OR effective_to >= $3::date)`,
                [employee_id, effectiveTo, effectiveFrom]
            );

            // 3. Re-create the old shift BEFORE the override (if it started before)
            if (previousShiftId && previousStart) {
                const prevStartStr = String(previousStart).slice(0, 10);
                if (prevStartStr < effectiveFrom) {
                    await client.query(
                        `INSERT INTO employee_shift_assignments (
                            employee_id, shift_id, effective_from, effective_to, assigned_by, updated_at
                         ) VALUES ($1, $2, $3::date, ($4::date - INTERVAL '1 day')::date, $5, NOW())`,
                        [employee_id, previousShiftId, prevStartStr, effectiveFrom, actorId]
                    );
                }
            }

            // 4. Insert the bounded override
            await client.query(
                `INSERT INTO employee_shift_assignments (
                    employee_id, shift_id, effective_from, effective_to, assigned_by, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, NOW())`,
                [employee_id, shift_id, effectiveFrom, effectiveTo, actorId]
            );

            // 5. Restore the previous shift AFTER the override ends
            if (previousShiftId) {
                await client.query(
                    `INSERT INTO employee_shift_assignments (
                        employee_id, shift_id, effective_from, effective_to, assigned_by, updated_at
                     ) VALUES ($1, $2, ($3::date + INTERVAL '1 day')::date, NULL, $4, NOW())`,
                    [employee_id, previousShiftId, effectiveTo, actorId]
                );
            }
        } else {
            // PERMANENT assignment: delete all assignments from this date forward
            await client.query(
                `DELETE FROM employee_shift_assignments
                 WHERE employee_id = $1
                   AND (effective_to IS NULL OR effective_to >= $2::date)`,
                [employee_id, effectiveFrom]
            );

            // Also terminate any assignment that spans across our start date
            await client.query(
                `UPDATE employee_shift_assignments
                 SET effective_to = ($2::date - INTERVAL '1 day')::date,
                     updated_at = NOW()
                 WHERE employee_id = $1
                   AND effective_from < $2::date
                   AND (effective_to IS NULL OR effective_to >= $2::date)`,
                [employee_id, effectiveFrom]
            );
        }

        // Insert the new assignment
        const assigned = await client.query(
            `INSERT INTO employee_shift_assignments (
                employee_id, shift_id, effective_from, effective_to, assigned_by, updated_at
             ) VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [employee_id, shift_id, effectiveFrom, effectiveTo, actorId]
        );

        await client.query('COMMIT');
        void notifyShiftAssignment({
            employee: employee.rows[0],
            shift: shift.rows[0],
            effectiveFrom,
            io: req.io,
        });
        res.json(assigned.rows[0]);
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('assignShiftToEmployee rollback error:', rollbackErr.message);
        }
        if (err.message && err.message.includes('effective_from')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('assignShiftToEmployee error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const assignShiftToDepartment = async (req, res) => {
    const { department_id, shift_id, effective_from } = req.body;
    const client = await pool.connect();

    try {
        await ensureShiftSchema();

        if (!department_id || !shift_id || !effective_from) {
            return res.status(400).json({ error: 'department_id, shift_id and effective_from are required' });
        }

        const effectiveFrom = parseDate(effective_from, 'effective_from');
        const effectiveTo = req.body.effective_to ? parseDate(req.body.effective_to, 'effective_to') : null;
        const actorId = await getActorEmployeeId(req);

        await client.query('BEGIN');

        const shift = await client.query('SELECT id, name, start_time, end_time FROM shifts WHERE id = $1', [shift_id]);
        if (shift.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Shift not found' });
        }

        const employeesRes = await client.query(
            `SELECT id, full_name, email, employee_id
             FROM employees
             WHERE department_id = $1
               AND COALESCE(status, 'Active') <> 'Inactive'`,
            [department_id]
        );

        if (employeesRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No active employees found for this department' });
        }

        let assignedCount = 0;
        for (const row of employeesRes.rows) {
            if (effectiveTo) {
                // BOUNDED: find previous shift, delete overlaps, create 3 segments
                const beforeRes = await client.query(
                    `SELECT shift_id, effective_from FROM employee_shift_assignments
                     WHERE employee_id = $1
                       AND effective_from <= $2::date
                       AND (effective_to IS NULL OR effective_to >= $2::date)
                     ORDER BY effective_from DESC, created_at DESC
                     LIMIT 1`,
                    [row.id, effectiveFrom]
                );
                const previousShiftId = beforeRes.rows[0]?.shift_id || null;
                const previousStart = beforeRes.rows[0]?.effective_from || null;

                await client.query(
                    `DELETE FROM employee_shift_assignments
                     WHERE employee_id = $1
                       AND effective_from <= $2::date
                       AND (effective_to IS NULL OR effective_to >= $3::date)`,
                    [row.id, effectiveTo, effectiveFrom]
                );

                // Re-create old shift BEFORE override
                if (previousShiftId && previousStart) {
                    const prevStartStr = String(previousStart).slice(0, 10);
                    if (prevStartStr < effectiveFrom) {
                        await client.query(
                            `INSERT INTO employee_shift_assignments (
                                employee_id, shift_id, effective_from, effective_to, assigned_by, updated_at
                             ) VALUES ($1, $2, $3::date, ($4::date - INTERVAL '1 day')::date, $5, NOW())`,
                            [row.id, previousShiftId, prevStartStr, effectiveFrom, actorId]
                        );
                    }
                }

                // Insert the bounded override
                await client.query(
                    `INSERT INTO employee_shift_assignments (
                        employee_id, shift_id, effective_from, effective_to, assigned_by, updated_at
                     ) VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [row.id, shift_id, effectiveFrom, effectiveTo, actorId]
                );

                // Restore previous shift AFTER override
                if (previousShiftId) {
                    await client.query(
                        `INSERT INTO employee_shift_assignments (
                            employee_id, shift_id, effective_from, effective_to, assigned_by, updated_at
                         ) VALUES ($1, $2, ($3::date + INTERVAL '1 day')::date, NULL, $4, NOW())`,
                        [row.id, previousShiftId, effectiveTo, actorId]
                    );
                }
            } else {
                // PERMANENT: delete future assignments and insert new one
                await client.query(
                    `DELETE FROM employee_shift_assignments
                     WHERE employee_id = $1
                       AND (effective_to IS NULL OR effective_to >= $2::date)`,
                    [row.id, effectiveFrom]
                );
                await client.query(
                    `UPDATE employee_shift_assignments
                     SET effective_to = ($2::date - INTERVAL '1 day')::date,
                         updated_at = NOW()
                     WHERE employee_id = $1
                       AND effective_from < $2::date
                       AND (effective_to IS NULL OR effective_to >= $2::date)`,
                    [row.id, effectiveFrom]
                );
            }

            await client.query(
                `INSERT INTO employee_shift_assignments (
                    employee_id, shift_id, effective_from, effective_to, assigned_by, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, NOW())`,
                [row.id, shift_id, effectiveFrom, effectiveTo, actorId]
            );

            assignedCount += 1;
        }

        await client.query('COMMIT');
        for (const employee of employeesRes.rows) {
            void notifyShiftAssignment({
                employee,
                shift: shift.rows[0],
                effectiveFrom,
                io: req.io,
            });
        }
        res.json({ assigned_count: assignedCount });
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('assignShiftToDepartment rollback error:', rollbackErr.message);
        }
        if (err.message && err.message.includes('effective_from')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('assignShiftToDepartment error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getWeeklyRoster = async (req, res) => {
    const weekStartRaw = req.query.week_start;
    const departmentId = req.query.department_id || null;

    try {
        await ensureShiftSchema();

        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const day = today.getUTCDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        today.setUTCDate(today.getUTCDate() + mondayOffset);

        const weekStart = weekStartRaw ? parseDate(weekStartRaw, 'week_start') : today.toISOString().slice(0, 10);

        const params = [weekStart];
        let employeeWhere = `WHERE COALESCE(e.status, 'Active') <> 'Inactive'`;
        if (departmentId) {
            params.push(departmentId);
            employeeWhere += ` AND e.department_id = $${params.length}`;
        }

        const query = `
            WITH week_days AS (
                SELECT generate_series($1::date, $1::date + INTERVAL '6 days', INTERVAL '1 day')::date AS day
            ),
            selected_employees AS (
                SELECT e.id, e.full_name, e.department,
                       d.name AS department_name
                FROM employees e
                LEFT JOIN departments d ON d.id = e.department_id
                ${employeeWhere}
                ORDER BY e.full_name
            )
            SELECT se.id AS employee_id,
                   se.full_name,
                   COALESCE(se.department_name, se.department, 'Unassigned') AS department_name,
                   TO_CHAR(wd.day, 'YYYY-MM-DD') AS day,
                   s.id AS shift_id,
                   s.name AS shift_name,
                   s.start_time,
                   s.end_time
            FROM selected_employees se
            CROSS JOIN week_days wd
            LEFT JOIN LATERAL (
                SELECT esa.shift_id
                FROM employee_shift_assignments esa
                WHERE esa.employee_id = se.id
                  AND esa.effective_from <= wd.day
                  AND (esa.effective_to IS NULL OR esa.effective_to >= wd.day)
                ORDER BY esa.effective_from DESC, esa.created_at DESC
                LIMIT 1
            ) active ON TRUE
            LEFT JOIN shifts s ON s.id = active.shift_id
            ORDER BY se.full_name, wd.day;
        `;

        const result = await pool.query(query, params);

        res.json({
            week_start: weekStart,
            roster: result.rows,
        });
    } catch (err) {
        if (err.message && err.message.includes('week_start')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('getWeeklyRoster error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getMyCurrentShift = async (req, res) => {
    try {
        await ensureShiftSchema();

        let employeeId = req.user.employee_uuid;
        if (!employeeId && req.user.email) {
            const empRes = await pool.query('SELECT id FROM employees WHERE email = $1 LIMIT 1', [req.user.email]);
            employeeId = empRes.rows[0]?.id;
        }

        if (!employeeId) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const result = await pool.query(
            `SELECT s.id, s.name, s.start_time, s.end_time,
                    esa.effective_from, esa.effective_to
             FROM employee_shift_assignments esa
             JOIN shifts s ON s.id = esa.shift_id
             WHERE esa.employee_id = $1
               AND esa.effective_from <= CURRENT_DATE
               AND (esa.effective_to IS NULL OR esa.effective_to >= CURRENT_DATE)
             ORDER BY esa.effective_from DESC, esa.created_at DESC
             LIMIT 1`,
            [employeeId]
        );

        res.json(result.rows[0] || null);
    } catch (err) {
        console.error('getMyCurrentShift error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    createShift,
    getShifts,
    assignShiftToEmployee,
    assignShiftToDepartment,
    getWeeklyRoster,
    getMyCurrentShift,
};

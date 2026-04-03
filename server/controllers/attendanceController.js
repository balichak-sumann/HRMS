const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const parseAttendanceDate = (attendanceDate) => {
    if (!attendanceDate) {
        const today = new Date();
        return today.toISOString().slice(0, 10);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
        throw new Error('attendance_date must be in YYYY-MM-DD format');
    }

    return attendanceDate;
};

const parseMonthRange = (monthValue) => {
    if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) {
        throw new Error('month must be in YYYY-MM format');
    }

    const [yearText, monthText] = monthValue.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('month must be in YYYY-MM format');
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
};

const isWeekendDate = (dateStr) => {
    const day = new Date(`${dateStr}T00:00:00`).getDay();
    return day === 0 || day === 6;
};

const buildTimestampForDate = (dateStr) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return new Date(`${dateStr}T${hh}:${mm}:${ss}`);
};

const parseTimeToMinutes = (timeValue) => {
    if (!timeValue) return null;
    const text = String(timeValue);
    const match = text.match(/^(\d{2}):(\d{2})(:\d{2})?$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
};

const getShiftForDate = async (employeeId, attendanceDate) => {
    const result = await pool.query(

        `SELECT s.id, s.name, s.start_time, s.end_time
         FROM employee_shift_assignments esa
         JOIN shifts s ON s.id = esa.shift_id
         WHERE esa.employee_id = $1
           AND esa.effective_from <= $2::date
           AND (esa.effective_to IS NULL OR esa.effective_to >= $2::date)
         ORDER BY esa.effective_from DESC, esa.created_at DESC
         LIMIT 1`,
        [employeeId, attendanceDate]
    );

    return result.rows[0] || null;
};

// ─── Record check-in ─────────────────────────────────────────────
const checkIn = async (req, res) => {
    try {
        let employee_id = req.user.employee_uuid;

        if (!employee_id) {
            const empRes = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
            employee_id = empRes.rows[0]?.id;
        }

        if (!employee_id) {
            return res.status(400).json({ error: 'Employee account not found. Please contact HR.' });
        }

        const attendanceDate = parseAttendanceDate(req.body?.attendance_date);
        if (isWeekendDate(attendanceDate)) {
            return res.status(400).json({ error: 'Check-in is disabled on Saturday and Sunday by default.' });
        }

        // Check for approved leave on this date
        const leaveCheck = await pool.query(
            "SELECT id FROM leaves WHERE employee_id = $1 AND status = 'Approved' AND $2::date BETWEEN start_date AND end_date",
            [employee_id, attendanceDate]
        );

        if (leaveCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Check-in is disabled because you have an approved leave for this date.' });
        }

        // Check for holidays on this date
        const holidayCheck = await pool.query(
            "SELECT name FROM holidays WHERE date = $1::date",
            [attendanceDate]
        );

        if (holidayCheck.rows.length > 0) {
            return res.status(400).json({ error: `Check-in is disabled today due to the holiday: ${holidayCheck.rows[0].name}.` });
        }

        console.log('[Attendance Check-In] Final employee_id:', employee_id);

        const { location } = req.body;
        const checkInAt = buildTimestampForDate(attendanceDate);

        const assignedShift = await getShiftForDate(employee_id, attendanceDate);
        const checkInTime = checkInAt.getHours() * 60 + checkInAt.getMinutes();
        const shiftStartMinutes = parseTimeToMinutes(assignedShift?.start_time);
        const status = shiftStartMinutes != null && checkInTime > shiftStartMinutes ? 'Late' : 'Present';

        // Check if record exists for today - update instead of creating duplicate
        const existing = await pool.query(
            "SELECT * FROM attendance WHERE employee_id = $1 AND DATE(check_in) = $2::date",
            [employee_id, attendanceDate]
        );

        let result;
        if (existing.rows.length > 0) {
            // Update existing record with latest check_in time
            result = await pool.query(
                "UPDATE attendance SET check_in = $1, status = $2, location = $3 WHERE employee_id = $4 AND DATE(check_in) = $5::date RETURNING *",
                [checkInAt, status, location, employee_id, attendanceDate]
            );
        } else {
            // Create new record
            result = await pool.query(
                "INSERT INTO attendance (employee_id, check_in, status, location) VALUES ($1, $2, $3, $4) RETURNING *",
                [employee_id, checkInAt, status, location]
            );
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.message && err.message.includes('attendance_date')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Record check-out ────────────────────────────────────────────
const checkOut = async (req, res) => {
    try {
        let employee_id = req.user.employee_uuid;

        if (!employee_id) {
            const empRes = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
            employee_id = empRes.rows[0]?.id;
        }

        if (!employee_id) {
            return res.status(400).json({ error: 'Employee account not found.' });
        }

        const attendanceDate = parseAttendanceDate(req.body?.attendance_date);
        if (isWeekendDate(attendanceDate)) {
            return res.status(400).json({ error: 'Check-out is disabled on Saturday and Sunday by default.' });
        }

        console.log('[Attendance Check-Out] Final employee_id:', employee_id);
        const checkOutAt = buildTimestampForDate(attendanceDate);

        // Update existing record with latest check_out time
        const result = await pool.query(
            "UPDATE attendance SET check_out = $1 WHERE employee_id = $2 AND DATE(check_in) = $3::date RETURNING *",
            [checkOutAt, employee_id, attendanceDate]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'No check-in found for the selected date. Please check in first.' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.message && err.message.includes('attendance_date')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get current user's attendance ───────────────────────────────
const getMyAttendance = async (req, res) => {
    try {
        let employee_id = req.user.employee_uuid;

        if (!employee_id) {
            const empRes = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
            employee_id = empRes.rows[0]?.id;
        }

        if (!employee_id) {
            return res.json([]);
        }

        console.log('[Attendance /my] Final employee_id:', employee_id);

        const result = await pool.query(
            "SELECT * FROM attendance WHERE employee_id = $1 ORDER BY check_in DESC",
            [employee_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get all attendance records (HR) ─────────────────────────────
const getAllAttendance = async (req, res) => {
    if (!['hr', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const date = req.query.date || parseAttendanceDate();
        const { department, employee_id } = req.query;
        let query = `
            SELECT
                e.id AS employee_id,
                e.full_name,
                e.department,
                e.role AS emp_role,
                a.id,
                a.check_in,
                a.check_out,
                COALESCE(a.status, 'On Leave') AS status,
                a.location
            FROM employees e
            LEFT JOIN attendance a
                ON a.employee_id = e.id
               AND DATE(a.check_in) = $1::date
            WHERE 1=1
        `;
        const params = [];

        params.push(date);

        if (department) {
            params.push(department);
            query += ` AND e.department = $${params.length}`;
        }
        if (employee_id) {
            params.push(employee_id);
            query += ` AND e.id = $${params.length}`;
        }

        query += " ORDER BY e.full_name ASC";

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get monthly attendance export data (HR/Admin) ──────────────────
const getMonthlyAttendanceExport = async (req, res) => {
    if (!['hr', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const { month, department, employee_id } = req.query;
        const { startDate, endDate } = parseMonthRange(month);

        let query = `
            SELECT
                e.id AS employee_id,
                e.full_name,
                e.department,
                COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) AS present_days,
                COALESCE(SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END), 0) AS late_days,
                COALESCE(SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END), 0) AS on_leave_days,
                COALESCE(SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END), 0) AS absent_days,
                COALESCE(SUM(CASE WHEN a.status = 'Half-Day' THEN 1 ELSE 0 END), 0) AS half_day_count,
                COALESCE(COUNT(a.id), 0) AS recorded_days,
                COALESCE(
                    ROUND(
                        SUM(
                            CASE
                                WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL
                                THEN EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 3600
                                ELSE 0
                            END
                        )::numeric,
                        2
                    ),
                    0
                ) AS total_hours
            FROM employees e
            LEFT JOIN attendance a
                ON a.employee_id = e.id
               AND DATE(a.check_in) BETWEEN $1::date AND $2::date
            WHERE 1=1
        `;

        const params = [startDate, endDate];

        if (department) {
            params.push(department);
            query += ` AND e.department = $${params.length}`;
        }

        if (employee_id) {
            params.push(employee_id);
            query += ` AND e.id = $${params.length}`;
        }

        query += `
            GROUP BY e.id, e.full_name, e.department
            ORDER BY e.full_name ASC
        `;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        if (err.message && err.message.includes('month must be')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update/Override attendance record (HR/Admin only) ─────────────
const updateAttendance = async (req, res) => {
    if (!['hr', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const { attendance_id } = req.params;
        const { check_in, check_out, status } = req.body;

        if (!attendance_id) {
            return res.status(400).json({ error: 'Attendance ID is required' });
        }

        // Validate that attendance record exists
        const existing = await pool.query(
            'SELECT * FROM attendance WHERE id = $1',
            [attendance_id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }

        // Build update query dynamically based on provided fields
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (check_in) {
            updates.push(`check_in = $${paramCount}`);
            values.push(new Date(check_in));
            paramCount++;
        }

        if (check_out) {
            updates.push(`check_out = $${paramCount}`);
            values.push(new Date(check_out));
            paramCount++;
        }

        if (status) {
            updates.push(`status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Add attendance_id as the last parameter
        values.push(attendance_id);

        const updateQuery = `
            UPDATE attendance
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(updateQuery, values);

        res.json({
            message: 'Attendance record updated successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

// ─── Create attendance record (HR/Admin only) ─────────────────────
const createAttendance = async (req, res) => {
    if (!['hr', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const { employee_id, date, status } = req.body;

        if (!employee_id || !date || !status) {
            return res.status(400).json({ error: 'employee_id, date, and status are required' });
        }

        // Check if record already exists for this employee on this date
        const existing = await pool.query(
            "SELECT * FROM attendance WHERE employee_id = $1 AND DATE(check_in) = $2::date",
            [employee_id, date]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Attendance record already exists for this employee on this date' });
        }

        // Create attendance record with status only (no check-in/out times)
        const result = await pool.query(
            "INSERT INTO attendance (employee_id, check_in, status) VALUES ($1, $2::date, $3) RETURNING *",
            [employee_id, date, status]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

module.exports = {
    checkIn,
    checkOut,
    getMyAttendance,
    getAllAttendance,
    getMonthlyAttendanceExport,
    updateAttendance,
    createAttendance
};

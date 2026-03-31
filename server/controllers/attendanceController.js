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

        console.log('[Attendance Check-In] Final employee_id:', employee_id);

        const { location } = req.body;
        const checkInAt = buildTimestampForDate(attendanceDate);

        const existing = await pool.query(
            "SELECT * FROM attendance WHERE employee_id = $1 AND DATE(check_in) = $2::date AND check_out IS NULL",
            [employee_id, attendanceDate]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'You are already checked in. Please check out first.' });
        }

        const assignedShift = await getShiftForDate(employee_id, attendanceDate);
        const checkInTime = checkInAt.getHours() * 60 + checkInAt.getMinutes();
        const shiftStartMinutes = parseTimeToMinutes(assignedShift?.start_time);
        const status = shiftStartMinutes != null && checkInTime > shiftStartMinutes ? 'Late' : 'Present';

        const result = await pool.query(
            "INSERT INTO attendance (employee_id, check_in, status, location) VALUES ($1, $2, $3, $4) RETURNING *",
            [employee_id, checkInAt, status, location]
        );

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

        const result = await pool.query(
            "UPDATE attendance SET check_out = $1 WHERE employee_id = $2 AND DATE(check_in) = $3::date AND check_out IS NULL RETURNING *",
            [checkOutAt, employee_id, attendanceDate]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'No active check-in found for the selected date' });
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

module.exports = {
    checkIn,
    checkOut,
    getMyAttendance,
    getAllAttendance
};

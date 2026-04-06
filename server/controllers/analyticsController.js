const { Pool } = require('../db');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const getTodayCelebrationsData = async () => {
    const result = await pool.query(`
        SELECT
            e.id,
            e.full_name,
            e.role,
            e.department,
            e.avatar_url,
            'birthday'::text AS celebration_type,
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.dob::date))::int AS years_count,
            TO_CHAR(e.dob, 'Mon DD') AS date_label
        FROM employees e
        WHERE e.status = 'Active'
          AND e.dob IS NOT NULL
          AND EXTRACT(MONTH FROM e.dob) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM e.dob) = EXTRACT(DAY FROM CURRENT_DATE)

        UNION ALL

        SELECT
            e.id,
            e.full_name,
            e.role,
            e.department,
            e.avatar_url,
            'work_anniversary'::text AS celebration_type,
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.joining_date::date))::int AS years_count,
            TO_CHAR(e.joining_date, 'Mon DD') AS date_label
        FROM employees e
        WHERE e.status = 'Active'
          AND e.joining_date IS NOT NULL
          AND EXTRACT(MONTH FROM e.joining_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM e.joining_date) = EXTRACT(DAY FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.joining_date::date)) >= 1

        ORDER BY celebration_type, full_name
    `);

    return result.rows;
};

// ─── Get analytics dashboard data (HR) ──────────────────────────
const getAnalytics = async (req, res) => {
    try {
        const headcount = await pool.query('SELECT COUNT(*) FROM employees WHERE status = \'Active\'');

        const deptBreakdown = await pool.query(
            'SELECT department as name, COUNT(*) as count FROM employees WHERE status = \'Active\' GROUP BY department'
        );

        const leaveBreakdown = await pool.query(
            'SELECT leave_type as name, COUNT(*) as value FROM leaves GROUP BY leave_type'
        );

        const newEmployees = await pool.query(
            'SELECT COUNT(*) FROM employees WHERE joining_date >= NOW() - INTERVAL \'30 days\''
        );

        const upcomingBirthdays = await pool.query(`
            SELECT full_name as name, role, TO_CHAR(dob, 'Mon DD') as date, avatar_url as avatar
            FROM employees 
            WHERE status = 'Active' AND dob IS NOT NULL 
            AND (
                (EXTRACT(MONTH FROM dob) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM dob) > EXTRACT(DAY FROM CURRENT_DATE))
                OR
                (EXTRACT(MONTH FROM dob) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month'))
            )
            ORDER BY 
                (EXTRACT(MONTH FROM dob) < EXTRACT(MONTH FROM CURRENT_DATE))::int,
                EXTRACT(MONTH FROM dob), 
                EXTRACT(DAY FROM dob)
            LIMIT 5
        `);

        const recentLeaves = await pool.query(`
            SELECT l.id, e.full_name as name, l.leave_type as type, l.status, e.avatar_url as avatar
            FROM leaves l
            JOIN employees e ON l.employee_id = e.id
            ORDER BY l.created_at DESC
            LIMIT 5
        `);

        const announcementsData = await pool.query(`
            SELECT a.id, a.title, a.content, e.full_name as author_name, e.avatar_url as author_avatar, a.created_at
            FROM announcements a
            LEFT JOIN employees e ON a.author_id = e.id
            ORDER BY a.created_at DESC
            LIMIT 5
        `);

        const todaysCelebrations = await getTodayCelebrationsData();

        res.json({
            headcount: parseInt(headcount.rows[0]?.count || 0),
            newEmployeesCount: parseInt(newEmployees.rows[0]?.count || 0),
            activeLeaves: (leaveBreakdown.rows || []).reduce((acc, curr) => acc + (parseInt(curr.value) || 0), 0),
            upcomingBirthdays: upcomingBirthdays.rows,
            todaysCelebrations,
            recentLeaves: recentLeaves.rows,
            announcements: announcementsData.rows,
            deptData: deptBreakdown.rows,
            leaveData: leaveBreakdown.rows
        });
    } catch (err) {
        console.error('[Analytics Error]:', err.message);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

const sendCelebrationMessage = async (req, res) => {
    const { employeeId } = req.params;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const senderRes = await pool.query(
            `SELECT e.id
             FROM employees e
             JOIN profiles p ON e.email = p.email OR e.employee_id = p.employee_id
             WHERE p.id = $1
             LIMIT 1`,
            [req.user.id]
        );

        const senderId = senderRes.rows[0]?.id;
        if (!senderId) {
            return res.status(404).json({ error: 'HR profile not found' });
        }

        const receiverRes = await pool.query(
            'SELECT id, full_name FROM employees WHERE id = $1 AND status = $2',
            [employeeId, 'Active']
        );

        if (!receiverRes.rows.length) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const inserted = await pool.query(
            `WITH inserted AS (
                INSERT INTO messages (sender_id, receiver_id, content)
                VALUES ($1, $2, $3)
                RETURNING *
            )
            SELECT i.*, e.full_name AS sender_name
            FROM inserted i
            JOIN employees e ON e.id = i.sender_id`,
            [senderId, employeeId, String(message).trim()]
        );

        const payload = inserted.rows[0];
        const roomId = [senderId, employeeId].sort().join('_');
        req.io.to(roomId).emit('receive_message', payload);
        req.io.to(employeeId).emit('receive_message', payload);

        return res.status(201).json({
            message: 'Celebration message sent successfully',
            chatMessage: payload,
            employeeName: receiverRes.rows[0].full_name
        });
    } catch (err) {
        console.error('[Celebration Message Error]:', err.message);
        return res.status(500).json({ error: 'Server error', details: err.message });
    }
};

module.exports = { getAnalytics, sendCelebrationMessage, getTodayCelebrationsData };

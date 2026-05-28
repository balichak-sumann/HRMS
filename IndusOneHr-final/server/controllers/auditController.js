const { Pool } = require('../db');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ─── Get audit logs (HR) ────────────────────────────────────────
const getAuditLogs = async (req, res) => {
    const { status, category, user, start_date, end_date } = req.query;
    try {
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        let params = [];
        let pIndex = 1;

        if (status && status !== 'All') {
            query += ` AND action = $${pIndex++}`;
            params.push(status);
        }
        if (category && category !== 'All') {
            query += ` AND module = $${pIndex++}`;
            params.push(category);
        }
        if (user && user.trim() !== '') {
            query += ` AND (full_name ILIKE $${pIndex} OR user_email ILIKE $${pIndex})`;
            pIndex++;
            params.push(`%${user}%`);
        }
        if (start_date) {
            query += ` AND created_at >= $${pIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND created_at <= $${pIndex++}`;
            params.push(`${end_date} 23:59:59`);
        }

        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { getAuditLogs };

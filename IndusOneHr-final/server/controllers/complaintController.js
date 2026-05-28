const { Pool } = require('../db');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ─── Create complaint ────────────────────────────────────────────
const createComplaint = async (req, res) => {
    const { category, description, attachment_url, is_anonymous } = req.body;
    try {
        const emp = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
        if (emp.rows.length === 0) return res.status(404).json({ error: 'Employee profile not found' });

        const employee_id = emp.rows[0].id;

        const newComplaint = await pool.query(
            'INSERT INTO complaints (employee_id, category, description, attachment_url, is_anonymous) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [employee_id, category, description, attachment_url, is_anonymous]
        );
        res.json(newComplaint.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get complaints ──────────────────────────────────────────────
const getComplaints = async (req, res) => {
    const { status, category } = req.query;
    try {
        let query = '';
        let params = [];

        if (['hr', 'admin'].includes(req.user.role)) {
            query = `
                SELECT 
                    c.*, 
                    CASE 
                        WHEN c.is_anonymous = TRUE THEN 'Anonymous' 
                        ELSE e.full_name 
                    END as submitted_by,
                    e.department
                FROM complaints c
                LEFT JOIN employees e ON c.employee_id = e.id
                WHERE 1=1
            `;
            let pIndex = 1;
            if (status && status !== 'All') {
                query += ` AND c.status = $${pIndex++}`;
                params.push(status);
            }
            if (category && category !== 'All') {
                query += ` AND c.category = $${pIndex++}`;
                params.push(category);
            }
        } else {
            const emp = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
            if (emp.rows.length === 0) return res.json([]);

            query = 'SELECT * FROM complaints WHERE employee_id = $1';
            params.push(emp.rows[0].id);
        }

        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update complaint status (HR) ────────────────────────────────
const updateComplaintStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE complaints SET status = $1 WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { createComplaint, getComplaints, updateComplaintStatus };

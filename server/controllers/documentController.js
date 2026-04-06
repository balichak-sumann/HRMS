const { Pool } = require('../db');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// ─── Get documents ───────────────────────────────────────────────
const getDocuments = async (req, res) => {
    try {
        let query = 'SELECT d.*, e.full_name as employee_name FROM documents d LEFT JOIN employees e ON d.employee_id = e.id';
        let params = [];

        if (!['hr', 'admin'].includes(req.user.role)) {
            const emp = await pool.query('SELECT id FROM employees WHERE email = $1', [req.user.email]);
            if (emp.rows.length > 0) {
                query += ' WHERE d.employee_id = $1 OR d.employee_id IS NULL';
                params.push(emp.rows[0].id);
            } else {
                query += ' WHERE d.employee_id IS NULL';
            }
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create document (HR) ───────────────────────────────────────
const createDocument = async (req, res) => {
    const { name, type, file_url, employee_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO documents (name, type, file_url, employee_id, uploaded_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, type, file_url, employee_id, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { getDocuments, createDocument };

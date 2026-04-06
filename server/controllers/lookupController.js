const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const getLookups = async (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM system_lookups WHERE is_active = true';
        let params = [];
        
        if (category) {
            query += ' AND category = $1';
            params.push(category);
        }
        
        query += ' ORDER BY sort_order ASC, value ASC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('getLookups error:', err.message);
        res.status(500).json({ error: 'Server error retrieving system lookups' });
    }
};

module.exports = {
    getLookups
};

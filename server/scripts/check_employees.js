const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const res = await pool.query("SELECT id, full_name, role, status FROM employees LIMIT 10");
        console.log('Employees:', JSON.stringify(res.rows, null, 2));
        
        const activeCount = await pool.query("SELECT count(*) FROM employees WHERE COALESCE(LOWER(status), 'active') = 'active'");
        console.log('Active count:', activeCount.rows[0].count);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();

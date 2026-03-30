const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkStatus() {
    try {
        console.log('--- Inactive Employees ---');
        const res = await pool.query("SELECT id, full_name, status, email FROM employees WHERE status = 'Inactive' OR status = 'inactive';");
        console.table(res.rows);
        
        console.log('\n--- Inactive Profiles ---');
        const profiles = await pool.query("SELECT email, status, employee_id FROM profiles WHERE status = 'Inactive' OR status = 'inactive';");
        console.table(profiles.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkStatus();

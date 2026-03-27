const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const query = `
            SELECT id, full_name, dob, status 
            FROM employees 
            WHERE dob IS NOT NULL
        `;
        const res = await pool.query(query);
        console.log("All birthdays in DB:", res.rows);
    } catch(err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();

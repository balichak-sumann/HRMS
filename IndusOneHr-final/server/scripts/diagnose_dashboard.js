const { Pool } = require('../db');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function diagnose() {
    try {
        // Mocking req.user as Super Admin
        const user = { role: 'Super Admin', id: 'some-id' }; 
        
        console.log('--- Fetching Cycles ---');
        const cycles = await pool.query('SELECT * FROM appraisal_cycles ORDER BY start_date DESC');
        console.log('Cycles count:', cycles.rows.length);

        console.log('--- Fetching All Employees ---');
        const allEmployees = await pool.query(
            `SELECT id, full_name, email, department_id, role, status
             FROM employees 
             WHERE COALESCE(LOWER(status), 'active') = 'active'
             ORDER BY full_name`
        );
        console.log('All Employees count:', allEmployees.rows.length);
        console.log('Sample employee:', allEmployees.rows[0]);

        console.log('--- Fetching Participant Rows ---');
        const rows = await pool.query(
            `SELECT ap.cycle_id,
                    e.id AS employee_id,
                    e.full_name
             FROM appraisal_participants ap
             JOIN employees e ON e.id = ap.employee_id`
        );
        console.log('Participant rows count:', rows.rows.length);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

diagnose();

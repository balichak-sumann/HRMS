require('dotenv').config({ path: './server/.env' });
const { Pool } = require('./db');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
    try {
        const date = '2026-04-06';
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
                a.location,
                a.total_hours
            FROM employees e
            LEFT JOIN (
                SELECT employee_id,
                       MIN(id::text) AS id,
                       MIN(check_in) AS check_in,
                       CASE WHEN COUNT(check_in) > COUNT(check_out) THEN NULL ELSE MAX(check_out) END AS check_out,
                       MIN(status) AS status,
                       MAX(location) AS location,
                       SUM(
                           CASE
                               WHEN check_in IS NOT NULL AND check_out IS NOT NULL
                               THEN GREATEST(0, EXTRACT(EPOCH FROM (check_out - check_in)) / 3600)
                               ELSE 0
                           END
                       ) AS total_hours
                FROM attendance
                WHERE DATE(check_in) = $1::date
                GROUP BY employee_id
            ) a ON a.employee_id = e.id
            ORDER BY e.full_name ASC
        `;
        console.log('Running query...');
        const result = await pool.query(query, [date]);
        console.log('Success! Rows:', result.rows.length);
    } catch (err) {
        console.error('FAILED:', err.message);
        console.error(err);
    } finally {
        await pool.end();
    }
}

test();

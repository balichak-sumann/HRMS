const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const query = `
            SELECT full_name as name, role, TO_CHAR(dob, 'Mon DD') as date, avatar_url as avatar, dob
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
        `;
        console.log("Running upcoming birthdays query...");
        console.log("CURRENT_DATE is:", new Date().toISOString());
        const res = await pool.query(query);
        console.log("Rows:", res.rows);
    } catch(err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();

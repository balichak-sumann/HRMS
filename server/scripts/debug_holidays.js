const { Pool } = require('../db');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkHolidays() {
    try {
        const result = await pool.query(
            "SELECT id, name, date, type FROM holidays WHERE EXTRACT(YEAR FROM date) = 2026"
        );
        console.log(`Found ${result.rows.length} holidays for 2026:`);
        console.table(result.rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkHolidays();

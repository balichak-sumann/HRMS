const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const query = `
            SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name 
            FROM information_schema.key_column_usage 
            JOIN information_schema.constraint_column_usage USING (constraint_name)
            WHERE key_column_usage.table_name = 'daily_reports';
        `;
        const res = await pool.query(query);
        console.log("Foreign keys:", res.rows);
    } catch(err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();

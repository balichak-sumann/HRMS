// Script to list all tables in the configured MySQL database
require('dotenv').config();
const { Pool } = require('./db');

async function listTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
    ORDER BY table_name
  `);
  console.log('Tables in database:', res.rows.map(r => r.table_name));
  await pool.end();
}

listTables().catch(err => { console.error('Error:', err); process.exit(1); });

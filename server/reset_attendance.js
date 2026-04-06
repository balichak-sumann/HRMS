require('dotenv').config();
const { Pool } = require('./db');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const res = await pool.query("DELETE FROM attendance WHERE DATE(check_in) = CURRENT_DATE");
    console.log(`Deleted ${res.rowCount} corrupted test records for today.`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();

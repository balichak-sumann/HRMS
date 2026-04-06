require('dotenv').config();
const { Pool } = require('./db');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const reports = await pool.query('SELECT id, project_id, employee_id, hours, created_at FROM daily_reports');
    console.log('Daily Reports:', reports.rows);
    
    if (reports.rows.length > 0) {
      const empId = reports.rows[0].employee_id;
      console.log('Testing Employee ID match for:', empId);
      
      const emps = await pool.query('SELECT id, full_name FROM employees WHERE id = $1', [empId]);
      console.log('Matched Employee:', emps.rows);
      
      const profs = await pool.query('SELECT id, email FROM profiles WHERE id = $1', [empId]);
      console.log('Matched Profile:', profs.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();

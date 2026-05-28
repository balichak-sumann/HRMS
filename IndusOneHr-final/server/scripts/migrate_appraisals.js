const { Pool } = require('../db');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    console.log('Migrating manager_appraisals table...');
    try {
        await pool.query(`
            ALTER TABLE manager_appraisals 
            ADD COLUMN IF NOT EXISTS employee_comment TEXT,
            ADD COLUMN IF NOT EXISTS employee_comment_at TIMESTAMP WITH TIME ZONE;
        `);
        console.log('✅ Migration successful');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();

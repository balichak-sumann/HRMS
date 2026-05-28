const { Pool } = require('../db');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
    console.log('Verifying appraisal refactor...');
    try {
        // 1. Check if columns exist
        const columns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'manager_appraisals' 
            AND column_name IN ('employee_comment', 'employee_comment_at');
        `);
        console.log(`Found columns: ${columns.rows.map(r => r.column_name).join(', ')}`);
        
        if (columns.rows.length !== 2) {
            throw new Error('Missing columns in manager_appraisals');
        }

        console.log('✅ Database verification successful');
    } catch (err) {
        console.error('❌ Verification failed:', err.message);
    } finally {
        await pool.end();
    }
}

verify();

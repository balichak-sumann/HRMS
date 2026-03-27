const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    console.log('Creating appraisal_participants table...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS appraisal_participants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                cycle_id UUID REFERENCES appraisal_cycles(id) ON DELETE CASCADE,
                employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(cycle_id, employee_id)
            );

            CREATE INDEX IF NOT EXISTS idx_appraisal_participants_cycle ON appraisal_participants(cycle_id);
            CREATE INDEX IF NOT EXISTS idx_appraisal_participants_employee ON appraisal_participants(employee_id);
        `);
        console.log('✅ Migration successful');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();

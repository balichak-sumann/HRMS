const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const seed = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Seed Statutory Settings
        const settingsCount = await client.query('SELECT COUNT(*) FROM payroll_statutory_settings');
        if (parseInt(settingsCount.rows[0].count) === 0) {
            console.log('Seeding payroll_statutory_settings...');
            await client.query(`
                INSERT INTO payroll_statutory_settings (
                    pf_employee_rate, pf_employer_rate, esi_employee_rate, esi_employer_rate,
                    basic_ratio, hra_ratio, conveyance_amount,
                    fixed_pf_deduction, fixed_employer_pf_deduction,
                    fixed_insurance_deduction, fixed_ptax_deduction
                ) VALUES (
                    12, 12, 0.75, 3.25,
                    0.4, 0.2, 0.2,
                    1800, 1800,
                    450, 200
                )
            `);
        } else {
            console.log('Statutory settings already exist.');
        }

        // 2. Seed TDS Slabs
        const slabsCount = await client.query('SELECT COUNT(*) FROM payroll_tds_slabs');
        if (parseInt(slabsCount.rows[0].count) === 0) {
            console.log('Seeding payroll_tds_slabs...');
            const slabs = [
                ['Exempt Slab', 0, 250000, 0],
                ['Lower Slab', 250001, 500000, 5],
                ['Middle Slab', 500001, 1000000, 20],
                ['Higher Slab', 1000001, null, 30]
            ];
            for (const slab of slabs) {
                await client.query(
                    'INSERT INTO payroll_tds_slabs (name, income_from, income_to, rate) VALUES ($1, $2, $3, $4)',
                    slab
                );
            }
        } else {
            console.log('TDS slabs already exist.');
        }

        await client.query('COMMIT');
        console.log('Seeding completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
};

seed();

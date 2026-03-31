require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setupDatabase() {
    try {
        console.log('━━━ IndusInnovate Database Seeding ━━━');


        const shouldSeed = String(process.env.SEED_DEFAULT_USERS || 'false').toLowerCase() === 'true';
        if (!shouldSeed) {
            console.log('ℹ️  SEED_DEFAULT_USERS is false. Skipping default user seeding.');
            console.log('   Set SEED_DEFAULT_USERS=true and provide explicit SEED_* env vars if you need seed accounts.');
            console.log('━━━ Migration Complete ━━━');
            process.exit(0);
        }

        const seedUsers = [
            {
                key: 'SUPERADMIN',
                role: 'admin',
                email: process.env.SEED_SUPERADMIN_EMAIL,
                employeeId: process.env.SEED_SUPERADMIN_ID,
                password: process.env.SEED_SUPERADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url'),
                employeeProfile: {
                    full_name: process.env.SEED_SUPERADMIN_NAME || 'Owner Admin',
                    role: process.env.SEED_SUPERADMIN_ROLE || 'Super Admin',
                    department: process.env.SEED_SUPERADMIN_DEPARTMENT || 'Administration',
                    status: process.env.SEED_SUPERADMIN_STATUS || 'Active',
                },
            },
            {
                key: 'HR',
                role: 'hr',
                email: process.env.SEED_HR_EMAIL,
                employeeId: process.env.SEED_HR_EMPLOYEE_ID,
                password: process.env.SEED_HR_PASSWORD || crypto.randomBytes(12).toString('base64url'),
                employeeProfile: null,
            },
            {
                key: 'EMPLOYEE',
                role: 'employee',
                email: process.env.SEED_EMPLOYEE_EMAIL,
                employeeId: process.env.SEED_EMPLOYEE_ID,
                password: process.env.SEED_EMPLOYEE_PASSWORD || crypto.randomBytes(12).toString('base64url'),
                employeeProfile: {
                    full_name: process.env.SEED_EMPLOYEE_NAME || 'Seed Employee',
                    role: process.env.SEED_EMPLOYEE_ROLE || 'Software Engineer',
                    department: process.env.SEED_EMPLOYEE_DEPARTMENT || null,
                    status: process.env.SEED_EMPLOYEE_STATUS || 'Active',
                },
            },
        ];

        for (const user of seedUsers) {
            if (!user.email || !user.employeeId) {
                const missingEnvHint = user.key === 'SUPERADMIN'
                    ? 'SEED_SUPERADMIN_EMAIL/SEED_SUPERADMIN_ID'
                    : user.key === 'HR'
                        ? 'SEED_HR_EMAIL/SEED_HR_EMPLOYEE_ID'
                        : 'SEED_EMPLOYEE_EMAIL/SEED_EMPLOYEE_ID';
                console.log(`ℹ️  Skipping ${user.key} seed. Missing ${missingEnvHint}.`);
                continue;
            }

            const existingProfile = await pool.query('SELECT id FROM profiles WHERE email = $1', [user.email]);
            if (existingProfile.rows.length > 0) {
                console.log(`ℹ️  ${user.key} profile already exists for ${user.email} — skipping.`);
                continue;
            }

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(user.password, salt);

            await pool.query(
                `INSERT INTO profiles (email, role, password_hash, employee_id, status, is_first_login)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [user.email, user.role, hash, user.employeeId, 'active', true]
            );

            if (user.employeeProfile) {
                const existingEmployee = await pool.query('SELECT id FROM employees WHERE email = $1', [user.email]);
                if (existingEmployee.rows.length === 0) {
                    await pool.query(
                        `INSERT INTO employees (full_name, email, role, department, employee_id, status)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            user.employeeProfile.full_name,
                            user.email,
                            user.employeeProfile.role,
                            user.employeeProfile.department,
                            user.employeeId,
                            user.employeeProfile.status,
                        ]
                    );
                }
            }

            console.log(`✅ Seeded ${user.key} account: ${user.email}`);
            const passwordEnvKey = user.key === 'SUPERADMIN'
                ? 'SEED_SUPERADMIN_PASSWORD'
                : user.key === 'HR'
                    ? 'SEED_HR_PASSWORD'
                    : 'SEED_EMPLOYEE_PASSWORD';
            if (!process.env[passwordEnvKey]) {
                console.log(`   Generated temporary password: ${user.password}`);
            }
        }

        // ─── Seed Statutory Settings ──────────────────────────────────
        console.log('━━━ Seeding Statutory Settings ━━━');
        try {
            const settingsCount = await pool.query('SELECT COUNT(*)::int FROM payroll_statutory_settings');
            if (settingsCount.rows[0].count === 0) {
                await pool.query(
                    `INSERT INTO payroll_statutory_settings (pf_employee_rate, pf_employer_rate, esi_employee_rate, esi_employer_rate, updated_at)
                     VALUES ($1, $2, $3, $4, NOW())`,
                    [12.0, 12.0, 0.75, 3.25]
                );
                console.log('✅ Default statutory rates seeded (PF 12%, ESI 0.75%/3.25%)');
            }

            const slabsCount = await pool.query('SELECT COUNT(*)::int FROM payroll_tds_slabs');
            if (slabsCount.rows[0].count === 0) {
                const slabs = [
                    { name: 'Slab 1', from: 0, to: 250000, rate: 0 },
                    { name: 'Slab 2', from: 250000, to: 500000, rate: 5 },
                    { name: 'Slab 3', from: 500000, to: 1000000, rate: 20 },
                    { name: 'Slab 4', from: 1000000, to: null, rate: 30 },
                ];
                for (const s of slabs) {
                    await pool.query(
                        'INSERT INTO payroll_tds_slabs (name, income_from, income_to, rate) VALUES ($1, $2, $3, $4)',
                        [s.name, s.from, s.to, s.rate]
                    );
                }
                console.log('✅ Default TDS slabs seeded (Tax-free up to 2.5L)');
            }
        } catch (seedErr) {
            console.warn('⚠️  Statutory seeding skipped (tables might not exist yet):', seedErr.message);
        }

        console.log('━━━ Migration Complete ━━━');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err.message);
        process.exit(1);
    }
}

setupDatabase();

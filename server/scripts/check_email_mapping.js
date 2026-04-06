require('dotenv').config();
const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const dupProfiles = await pool.query(
            `SELECT LOWER(email) AS email, COUNT(*) AS cnt
             FROM profiles
             GROUP BY LOWER(email)
             HAVING COUNT(*) > 1`
        );

        const dupEmployees = await pool.query(
            `SELECT LOWER(email) AS email, COUNT(*) AS cnt
             FROM employees
             GROUP BY LOWER(email)
             HAVING COUNT(*) > 1`
        );

        const orphanEmployeeProfiles = await pool.query(
            `SELECT p.id, p.email, p.employee_id
             FROM profiles p
             LEFT JOIN employees e
               ON LOWER(e.email) = LOWER(p.email)
               OR e.id::text = p.employee_id
             WHERE p.role = 'employee'
               AND e.id IS NULL`
        );

        const crossMapEmails = await pool.query(
            `SELECT
                LOWER(p.email) AS email,
                COUNT(DISTINCT p.id) AS profile_count,
                COUNT(DISTINCT e.id) AS employee_count
             FROM profiles p
             LEFT JOIN employees e
               ON LOWER(e.email) = LOWER(p.email)
             GROUP BY LOWER(p.email)
             HAVING COUNT(DISTINCT p.id) > 1
                OR COUNT(DISTINCT e.id) > 1`
        );

        console.log('DUP_PROFILES', dupProfiles.rowCount);
        if (dupProfiles.rowCount) console.log(JSON.stringify(dupProfiles.rows, null, 2));

        console.log('DUP_EMPLOYEES', dupEmployees.rowCount);
        if (dupEmployees.rowCount) console.log(JSON.stringify(dupEmployees.rows, null, 2));

        console.log('ORPHAN_EMPLOYEE_PROFILES', orphanEmployeeProfiles.rowCount);
        if (orphanEmployeeProfiles.rowCount) console.log(JSON.stringify(orphanEmployeeProfiles.rows, null, 2));

        console.log('CROSS_MAP_EMAILS', crossMapEmails.rowCount);
        if (crossMapEmails.rowCount) console.log(JSON.stringify(crossMapEmails.rows, null, 2));
    } catch (err) {
        console.error('CHECK_FAILED', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

run();

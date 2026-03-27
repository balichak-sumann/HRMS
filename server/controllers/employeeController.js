const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const dns = require('dns').promises;
const { createOnboardingCaseFromTemplate } = require('../services/onboardingService');
const { sendWelcomeEmail, sendAccountStatusEmail } = require('../services/emailService');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const isStrictEmailReachabilityEnabled = String(process.env.STRICT_EMAIL_REACHABILITY || '').toLowerCase() === 'true';

let employeeColumnsEnsured = false;
let profileStatusConstraintEnsured = false;

const isEmailDomainReachable = async (email) => {
    const domain = String(email || '').split('@')[1]?.trim().toLowerCase();
    if (!domain) return false;

    try {
        const mx = await dns.resolveMx(domain);
        if (Array.isArray(mx) && mx.length > 0) return true;
    } catch (_) {
        // Fallback to A/AAAA lookup when MX is not explicitly published.
    }

    try {
        const ipv4 = await dns.resolve4(domain);
        if (Array.isArray(ipv4) && ipv4.length > 0) return true;
    } catch (_) {
        // Continue to IPv6 check.
    }

    try {
        const ipv6 = await dns.resolve6(domain);
        return Array.isArray(ipv6) && ipv6.length > 0;
    } catch (_) {
        // In locked-down server networks DNS may be unavailable.
        // Reachability is treated as a soft signal unless strict mode is enabled.
        return !isStrictEmailReachabilityEnabled;
    }
};

const ensureEmployeeColumns = async () => {
    if (employeeColumnsEnsured) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS departments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS location TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_email TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS technology TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS experience_years NUMERIC;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS aadhaar_card TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id) ON DELETE SET NULL;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id UUID;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_revision_history_enabled BOOLEAN NOT NULL DEFAULT FALSE;

        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.table_constraints
                WHERE constraint_name = 'employees_department_id_fkey'
                  AND table_name = 'employees'
            ) THEN
                ALTER TABLE employees
                ADD CONSTRAINT employees_department_id_fkey
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
            END IF;
        END $$;

        UPDATE employees
        SET manager_id = reporting_manager_id
        WHERE manager_id IS NULL
          AND reporting_manager_id IS NOT NULL;

        UPDATE employees
        SET reporting_manager_id = manager_id
        WHERE reporting_manager_id IS NULL
          AND manager_id IS NOT NULL;

    `);

    employeeColumnsEnsured = true;
};

const ensureProfileStatusConstraint = async () => {
    if (profileStatusConstraintEnsured) return;

    await pool.query(`
        ALTER TABLE profiles
        ALTER COLUMN status SET DEFAULT 'active';

        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.table_constraints
                WHERE table_name = 'profiles'
                  AND constraint_name = 'profiles_status_check'
            ) THEN
                ALTER TABLE profiles DROP CONSTRAINT profiles_status_check;
            END IF;

            ALTER TABLE profiles
              ADD CONSTRAINT profiles_status_check
              CHECK (status IN ('active', 'inactive', 'pending_activation'));
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
        END $$;
    `);

    profileStatusConstraintEnsured = true;
};

// ─── Get all employees ───────────────────────────────────────────
const getEmployees = async (req, res) => {
    try {
        await ensureEmployeeColumns();
        const rawManagerId = req.query.manager_id || null;
        const scope = String(req.query.scope || '').toLowerCase();
        let managerIdFilter = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawManagerId || '')
            ? rawManagerId
            : null;

        // For HR, default to full list. Team-only filtering is opt-in via scope=team.
        if (req.user?.role === 'hr' && scope === 'team') {
            managerIdFilter = req.user?.employee_uuid || null;
        }

        const includeSelf = String(req.query.include_self || '').toLowerCase() === 'true';
        const employees = await pool.query(
            `SELECT e.*, 
                    COALESCE(d.name, e.department, 'Unassigned') AS department,
                    d.name AS department_name,
                    d.id AS department_id,
                    COALESCE(e.manager_id, e.reporting_manager_id) AS manager_id,
                    m.full_name AS manager_name,
                    p.role AS account_role
             FROM employees e
             LEFT JOIN departments d ON d.id = e.department_id
             LEFT JOIN employees m ON m.id = COALESCE(e.manager_id, e.reporting_manager_id)
             LEFT JOIN profiles p ON p.employee_id = e.id::text OR p.email = e.email
             WHERE (
                $1::uuid IS NULL
                OR COALESCE(e.manager_id, e.reporting_manager_id) = $1::uuid
                OR ($2::boolean = TRUE AND e.id = $1::uuid)
             )
             ORDER BY e.created_at DESC`,
            [managerIdFilter, includeSelf]
        );
        res.json(employees.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get HR accounts (admin only) ──────────────────────────────
const getHrAccounts = async (req, res) => {
    try {
        await ensureEmployeeColumns();

        const result = await pool.query(
            `SELECT e.id,
                    e.full_name,
                    e.email,
                    e.joining_date,
                    e.department,
                    e.created_at,
                    e.status,
                    p.role AS account_role
             FROM employees e
             JOIN profiles p ON (p.employee_id = e.id::text OR p.email = e.email)
             WHERE p.role = 'hr'
             ORDER BY e.created_at DESC`
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get dashboard stats for logged-in employee ──────────────────
const getDashboardStats = async (req, res) => {
    const employeeId = req.user.employee_uuid || req.user.employee_id;
    if (!employeeId) {
        return res.status(404).json({ error: 'Employee profile not linked to this user' });
    }

    try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(employeeId)) {
            return res.json({
                attendanceCount: 0,
                leavesCount: 0,
                projects: []
            });
        }

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const attendance = await pool.query(
            `SELECT COUNT(*) FROM attendance 
             WHERE employee_id = $1 
             AND EXTRACT(MONTH FROM check_in) = $2 
             AND EXTRACT(YEAR FROM check_in) = $3`,
            [employeeId, month, year]
        );

        const leaves = await pool.query(
            `SELECT COUNT(*) FROM leaves 
             WHERE employee_id = $1 
             AND status = 'Approved'
             AND (EXTRACT(MONTH FROM start_date) = $2 OR EXTRACT(MONTH FROM end_date) = $2)
             AND (EXTRACT(YEAR FROM start_date) = $3 OR EXTRACT(YEAR FROM end_date) = $3)`,
            [employeeId, month, year]
        );

        const projects = await pool.query(
            `SELECT p.name, p.status, p.progress 
             FROM projects p 
             JOIN project_members pm ON p.id = pm.project_id 
             WHERE pm.employee_id = $1 AND p.status = 'Active'
             ORDER BY p.created_at DESC`,
            [employeeId]
        );

        const celebrations = await pool.query(
            `SELECT celebration_type, years_count
             FROM (
                SELECT 'birthday'::text AS celebration_type,
                       EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date))::int AS years_count
                FROM employees
                WHERE id = $1
                  AND status = 'Active'
                  AND dob IS NOT NULL
                  AND EXTRACT(MONTH FROM dob) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(DAY FROM dob) = EXTRACT(DAY FROM CURRENT_DATE)

                UNION ALL

                SELECT 'work_anniversary'::text AS celebration_type,
                       EXTRACT(YEAR FROM AGE(CURRENT_DATE, joining_date::date))::int AS years_count
                FROM employees
                WHERE id = $1
                  AND status = 'Active'
                  AND joining_date IS NOT NULL
                  AND EXTRACT(MONTH FROM joining_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(DAY FROM joining_date) = EXTRACT(DAY FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, joining_date::date)) >= 1
             ) c`,
            [employeeId]
        );

        const hasBirthdayToday = celebrations.rows.some((c) => c.celebration_type === 'birthday');
        const hasWorkAnniversaryToday = celebrations.rows.some((c) => c.celebration_type === 'work_anniversary');

        res.json({
            attendanceCount: parseInt(attendance.rows[0].count),
            leavesCount: parseInt(leaves.rows[0].count),
            projects: projects.rows,
            celebrationsToday: celebrations.rows,
            hasBirthdayToday,
            hasWorkAnniversaryToday
        });
    } catch (err) {
        console.error('[Dashboard Stats Error]:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get employee by ID ──────────────────────────────────────────
const getEmployeeById = async (req, res) => {
    try {
        await ensureEmployeeColumns();
        const { id } = req.params;
        const result = await pool.query(
            `SELECT e.*, 
                    COALESCE(d.name, e.department, 'Unassigned') AS department,
                    d.name AS department_name,
                    d.id AS department_id,
                    COALESCE(e.manager_id, e.reporting_manager_id) AS manager_id,
                    m.full_name AS manager_name
             FROM employees e
             LEFT JOIN departments d ON d.id = e.department_id
             LEFT JOIN employees m ON m.id = COALESCE(e.manager_id, e.reporting_manager_id)
             WHERE e.id::text = $1 OR e.employee_id = $1
             LIMIT 1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create employee (HR only) ──────────────────────────────────
const createEmployee = async (req, res) => {
    const {
        full_name, email, role, department, phone, joining_date, salary,
        employee_id, designation, location, pan, bank_account, bank_name,
        personal_email, emergency_contact, technology, experience_years,
        aadhaar_card, adhar_card, pan_card, dob,
        onboarding_template_id, department_id, manager_id, reporting_manager_id,
        account_role
    } = req.body;
    const avatar_url = req.file ? `/uploads/avatars/${req.file.filename}` : null;
    const client = await pool.connect();
    const jobRoleRegex = /^[A-Za-z][A-Za-z\s.&'/-]*$/;
    const aadhaarRegex = /^\d{12}$/;
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
    const bankAccountRegex = /^\d{9,18}$/;
    const phoneRegex = /^(\d{10}|\+91\d{10})$/;
    const emergencyContactRegex = /^\d{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    try {
        await ensureEmployeeColumns();
        await ensureProfileStatusConstraint();
        await client.query('BEGIN');

        const normalizedFullName = String(full_name || '').trim();
        if (!normalizedFullName) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Please enter full name' });
        }

        const normalizedJobRole = String(role || '').trim();
        if (!normalizedJobRole || !jobRoleRegex.test(normalizedJobRole)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Role must contain only alphabets and valid separators (no numbers).' });
        }

        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Please provide a valid work email address.' });
        }

        const existingEmailCheck = await client.query(
            `SELECT email FROM profiles WHERE email = $1 UNION SELECT email FROM employees WHERE email = $1`,
            [normalizedEmail]
        );
        if (existingEmailCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Email already exists in the system' });
        }

        const isWorkEmailReachable = await isEmailDomainReachable(normalizedEmail);
        if (isStrictEmailReachabilityEnabled && !isWorkEmailReachable) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Please provide a valid, reachable work email address.' });
        }

        const normalizedEmployeeCode = String(employee_id || '').trim();

        const normalizedPersonalEmail = String(personal_email || '').trim().toLowerCase();
        if (normalizedPersonalEmail && !emailRegex.test(normalizedPersonalEmail)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Please provide a valid personal email address.' });
        }

        const normalizedPhone = String(phone || '').replace(/[\s-]/g, '').trim();
        if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Phone Number must be 10 digits or +91 followed by 10 digits.' });
        }

        const normalizedDesignation = String(designation || '').trim();
        if (normalizedDesignation && !jobRoleRegex.test(normalizedDesignation)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Designation must contain only alphabets and valid separators (no numbers).' });
        }


        const normalizedAadhaar = String(aadhaar_card || adhar_card || '').replace(/\s+/g, '').trim();
        if (normalizedAadhaar && !aadhaarRegex.test(normalizedAadhaar)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Aadhaar Number must be exactly 12 digits.' });
        }

        const normalizedPan = String(pan || pan_card || '').replace(/\s+/g, '').toUpperCase().trim();
        if (normalizedPan && !panRegex.test(normalizedPan)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'PAN Number must be in format ABCDE1234F.' });
        }

        // Duplicate PAN/Aadhaar check
        if (normalizedPan) {
            const panCheck = await client.query('SELECT id FROM employees WHERE pan = $1', [normalizedPan]);
            if (panCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'PAN already exists for another employee' });
            }
        }
        if (normalizedAadhaar) {
            const aadhaarCheck = await client.query('SELECT id FROM employees WHERE aadhaar_card = $1', [normalizedAadhaar]);
            if (aadhaarCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Aadhaar already exists for another employee' });
            }
        }

        const normalizedBankAccount = String(bank_account || '').replace(/\s+/g, '').trim();
        if (normalizedBankAccount && !bankAccountRegex.test(normalizedBankAccount)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Bank Account Number must be 9 to 18 digits.' });
        }

        const normalizedEmergencyContact = String(emergency_contact || '').replace(/\s+/g, '').trim();
        if (normalizedEmergencyContact && !emergencyContactRegex.test(normalizedEmergencyContact)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Emergency Contact Number must be exactly 10 digits.' });
        }

        const incomingSalary = Number(salary);
        if (!Number.isFinite(incomingSalary) || incomingSalary <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Valid annual salary is required' });
        }
        const normalizedSalary = incomingSalary;
        const parsedExperience = Number(experience_years);
        const normalizedExperienceYears = Number.isFinite(parsedExperience) ? parsedExperience : null;
        const nextManagerId = manager_id || reporting_manager_id || null;
        const requestedAccountRole = String(account_role || '').toLowerCase();

        if (requestedAccountRole === 'hr' && req.user?.role !== 'admin') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Only admins can create HR accounts' });
        }

        const profileRole = req.user?.role === 'admin' && ['hr', 'employee'].includes(requestedAccountRole)
            ? requestedAccountRole
            : 'employee';

        const effectiveManagerId = profileRole === 'hr'
            ? null
            : (req.user?.role === 'hr' ? (req.user?.employee_uuid || nextManagerId) : nextManagerId);

        if (effectiveManagerId) {
            const managerCheck = await client.query('SELECT id FROM employees WHERE id = $1', [effectiveManagerId]);
            if (managerCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Reporting manager not found' });
            }
        }

        let departmentIdValue = null;
        let departmentNameValue = department || 'Unassigned';
        if (department_id) {
            const dep = await client.query('SELECT id, name FROM departments WHERE id = $1', [department_id]);
            if (dep.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Department not found' });
            }
            departmentIdValue = dep.rows[0].id;
            departmentNameValue = dep.rows[0].name;
        }

        if (normalizedEmployeeCode) {
            const existingEmployeeCodeCheck = await client.query(
                'SELECT id FROM employees WHERE employee_id = $1 LIMIT 1',
                [normalizedEmployeeCode]
            );

            if (existingEmployeeCodeCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Employee Code already exists' });
            }
        }

        const newEmployee = await client.query(
            `INSERT INTO employees
             (full_name, email, role, department, department_id, manager_id, reporting_manager_id, phone, joining_date, salary, avatar_url, employee_id, designation, location, pan, bank_account, bank_name, personal_email, emergency_contact, technology, experience_years, aadhaar_card, dob)
             VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
             RETURNING *`,
            [
                normalizedFullName, normalizedEmail, normalizedJobRole, departmentNameValue, departmentIdValue, effectiveManagerId,
                normalizedPhone, joining_date, normalizedSalary, avatar_url,
                normalizedEmployeeCode || null, normalizedDesignation || normalizedJobRole || null, location || null,
                normalizedPan || null, normalizedBankAccount || null, bank_name || null,
                normalizedPersonalEmail || null, normalizedEmergencyContact || null, technology || null,
                normalizedExperienceYears,
                normalizedAadhaar || null,
                dob || null
            ]
        );

        const tempPassword = crypto.randomBytes(16).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(tempPassword, salt);

        const profileResult = await client.query(
            'INSERT INTO profiles (email, password_hash, role, employee_id, is_first_login, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email',
            [normalizedEmail, hash, profileRole, newEmployee.rows[0].id, true, 'pending_activation']
        );
        const profile = profileResult.rows[0];

        // Create a password reset link so employee can set a new password immediately.
        const resetToken = crypto.randomUUID();
        await client.query('UPDATE password_reset_tokens SET used = TRUE WHERE profile_id = $1', [profile.id]);
        await client.query(
            "INSERT INTO password_reset_tokens (profile_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
            [profile.id, resetToken]
        );

        if (onboarding_template_id) {
            await createOnboardingCaseFromTemplate({
                client,
                employeeId: newEmployee.rows[0].id,
                templateId: onboarding_template_id,
                assignedBy: req.user?.employee_uuid || null
            });
        }

        try {
            const resetBase = process.env.CLIENT_URL || 'http://localhost:5173';
            const resetLink = `${resetBase.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
            const mailInfo = await sendWelcomeEmail({
                to: normalizedEmail,
                name: normalizedFullName,
                email: normalizedEmail,
                password: tempPassword,
                role: profileRole === 'hr' ? 'HR' : (normalizedJobRole || normalizedDesignation || 'Employee'),
                resetLink
            });

            const acceptedRecipients = Array.isArray(mailInfo?.accepted)
                ? mailInfo.accepted.map((item) => String(item).trim().toLowerCase())
                : [];
            const rejectedRecipients = Array.isArray(mailInfo?.rejected)
                ? mailInfo.rejected.map((item) => String(item).trim().toLowerCase())
                : [];
            const wasAccepted = acceptedRecipients.includes(normalizedEmail);
            const wasRejected = rejectedRecipients.includes(normalizedEmail);

            if (!wasAccepted || wasRejected) {
                throw new Error('WELCOME_EMAIL_NOT_ACCEPTED_BY_SMTP');
            }
        } catch (emailErr) {
            await client.query('ROLLBACK');
            console.warn('[Email] Welcome credentials email failed:', emailErr.message);

            if (String(emailErr?.message || '').includes('WELCOME_EMAIL_NOT_ACCEPTED_BY_SMTP')) {
                return res.status(400).json({
                    error: 'Work email address was not accepted by the mail server. Employee was not created.'
                });
            }

            const rejectedRecipient = Array.isArray(emailErr?.rejected)
                && emailErr.rejected.some((item) => String(item).toLowerCase() === normalizedEmail);
            const responseCode = Number(emailErr?.responseCode);
            const hasHardBounce = Number.isFinite(responseCode) && responseCode >= 500;
            const hasRecipientHint = /recipient|mailbox|user unknown|invalid|not exist|undeliverable/i.test(String(emailErr?.message || ''));

            if (rejectedRecipient || hasHardBounce || hasRecipientHint) {
                return res.status(400).json({
                    error: 'Work email address could not be verified. Please enter a valid email address.'
                });
            }

            return res.status(503).json({
                error: 'Unable to verify email delivery right now. Please try again later.'
            });
        }

        await client.query('COMMIT');

        res.json({
            ...newEmployee.rows[0],
            credential_email_sent: true
        });
    } catch (err) {
        await client.query('ROLLBACK');
        if (
            err?.code === '23505' &&
            (
                String(err?.constraint || '').toLowerCase().includes('employee_id') ||
                String(err?.detail || '').toLowerCase().includes('employee_id')
            )
        ) {
            return res.status(400).json({ error: 'Employee Code already exists' });
        }
        console.error(err.message);
        res.status(500).json({ error: 'Server error', details: err.message });
    } finally {
        client.release();
    }
};

// ─── Update employee (HR only) ──────────────────────────────────
const updateEmployee = async (req, res) => {
    const {
        full_name, email, role, department, phone, joining_date, salary,
        employee_id, designation, location, pan, bank_account, bank_name,
        personal_email, emergency_contact, technology, experience_years,
        aadhaar_card, adhar_card, pan_card, dob,
        department_id, manager_id, reporting_manager_id, account_role
    } = req.body;
    const avatar_url = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;
    const jobRoleRegex = /^[A-Za-z][A-Za-z\s.&'/-]*$/;
    const aadhaarRegex = /^\d{12}$/;
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
    const bankAccountRegex = /^\d{9,18}$/;
    const phoneRegex = /^(\d{10}|\+91\d{10})$/;
    const emergencyContactRegex = /^\d{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    try {
        await ensureEmployeeColumns();

        const normalizedFullName = String(full_name || '').trim();
        if (!normalizedFullName) {
            return res.status(400).json({ error: 'Please enter full name' });
        }

        const incomingSalary = Number(salary);
        if (!Number.isFinite(incomingSalary) || incomingSalary <= 0) {
            return res.status(400).json({ error: 'Valid annual salary is required' });
        }
        const normalizedSalary = incomingSalary;
        const normalizedJobRole = String(role || '').trim();
        if (!normalizedJobRole || !jobRoleRegex.test(normalizedJobRole)) {
            return res.status(400).json({ error: 'Role must contain only alphabets and valid separators (no numbers).' });
        }

        const normalizedDesignation = String(designation || '').trim();
        if (normalizedDesignation && !jobRoleRegex.test(normalizedDesignation)) {
            return res.status(400).json({ error: 'Designation must contain only alphabets and valid separators (no numbers).' });
        }

        const normalizedAadhaar = String(aadhaar_card || adhar_card || '').replace(/\s+/g, '').trim();
        if (normalizedAadhaar && !aadhaarRegex.test(normalizedAadhaar)) {
            return res.status(400).json({ error: 'Aadhaar Number must be exactly 12 digits.' });
        }

        const normalizedPan = String(pan || pan_card || '').replace(/\s+/g, '').toUpperCase().trim();
        if (normalizedPan && !panRegex.test(normalizedPan)) {
            return res.status(400).json({ error: 'PAN Number must be in format ABCDE1234F.' });
        }

        const normalizedBankAccount = String(bank_account || '').replace(/\s+/g, '').trim();
        if (normalizedBankAccount && !bankAccountRegex.test(normalizedBankAccount)) {
            return res.status(400).json({ error: 'Bank Account Number must be 9 to 18 digits.' });
        }

        const normalizedEmergencyContact = String(emergency_contact || '').replace(/\s+/g, '').trim();
        if (normalizedEmergencyContact && !emergencyContactRegex.test(normalizedEmergencyContact)) {
            return res.status(400).json({ error: 'Emergency Contact Number must be exactly 10 digits.' });
        }

        const parsedExperience = Number(experience_years);
        const normalizedExperienceYears = Number.isFinite(parsedExperience) ? parsedExperience : null;
        const normalizedEmployeeCode = String(employee_id || '').trim();
        const nextManagerId = manager_id || reporting_manager_id || null;
        const normalizedAccountRole = typeof account_role === 'string' ? account_role.trim().toLowerCase() : '';
        const allowedAccountRoles = new Set(['admin', 'hr', 'employee']);

        const existingEmployeeResult = await pool.query('SELECT id, email FROM employees WHERE id = $1', [req.params.id]);
        if (existingEmployeeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        const currentEmployeeEmail = existingEmployeeResult.rows[0].email;
        const requestedEmail = String(email || '').trim().toLowerCase();
        const normalizedCurrentEmployeeEmail = String(currentEmployeeEmail || '').trim().toLowerCase();

        if (requestedEmail && !emailRegex.test(requestedEmail)) {
            return res.status(400).json({ error: 'Please provide a valid work email address.' });
        }

        const normalizedPersonalEmail = String(personal_email || '').trim().toLowerCase();
        if (normalizedPersonalEmail && !emailRegex.test(normalizedPersonalEmail)) {
            return res.status(400).json({ error: 'Please provide a valid personal email address.' });
        }

        const normalizedPhone = String(phone || '').replace(/[\s-]/g, '').trim();
        if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
            return res.status(400).json({ error: 'Phone Number must be 10 digits or +91 followed by 10 digits.' });
        }

        if (requestedEmail && requestedEmail !== normalizedCurrentEmployeeEmail) {
            return res.status(400).json({ error: 'Email cannot be changed once the account is created.' });
        }

        if (normalizedEmployeeCode) {
            const duplicateEmployeeCodeCheck = await pool.query(
                'SELECT id FROM employees WHERE employee_id = $1 AND id <> $2 LIMIT 1',
                [normalizedEmployeeCode, req.params.id]
            );

            if (duplicateEmployeeCodeCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Employee Code already exists' });
            }
        }

        let targetProfileId = null;
        if (normalizedAccountRole) {
            if (!allowedAccountRoles.has(normalizedAccountRole)) {
                return res.status(400).json({ error: 'Invalid account role selected' });
            }

            if (req.user?.role !== 'admin') {
                return res.status(403).json({ error: 'Only admin can change account roles' });
            }

            const linkedProfile = await pool.query(
                `SELECT id
                 FROM profiles
                 WHERE employee_id = $1
                    OR email = $2
                    OR email = $3
                 LIMIT 1`,
                [req.params.id, currentEmployeeEmail, email || currentEmployeeEmail]
            );

            if (linkedProfile.rows.length === 0) {
                return res.status(404).json({ error: 'Linked login profile not found for this employee' });
            }

            targetProfileId = linkedProfile.rows[0].id;
            if (String(targetProfileId) === String(req.user.id)) {
                return res.status(403).json({ error: 'Admin cannot change their own role' });
            }
        }

        if (nextManagerId && nextManagerId === req.params.id) {
            return res.status(400).json({ error: 'Employee cannot report to self' });
        }

        if (nextManagerId) {
            const managerCheck = await pool.query('SELECT id FROM employees WHERE id = $1', [nextManagerId]);
            if (managerCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Reporting manager not found' });
            }
        }

        let departmentIdValue = null;
        let departmentNameValue = department || 'Unassigned';
        if (department_id) {
            const dep = await pool.query('SELECT id, name FROM departments WHERE id = $1', [department_id]);
            if (dep.rows.length === 0) {
                return res.status(400).json({ error: 'Department not found' });
            }
            departmentIdValue = dep.rows[0].id;
            departmentNameValue = dep.rows[0].name;
        }

        let query = `
            UPDATE employees
            SET full_name = $1, email = $2, role = $3, department = $4, department_id = $5,
                manager_id = $6, reporting_manager_id = $6, phone = $7,
                joining_date = $8, salary = $9, employee_id = $10, designation = $11,
                location = $12, pan = $13, bank_account = $14, bank_name = $15,
                personal_email = $16, emergency_contact = $17, technology = $18,
                experience_years = $19, aadhaar_card = $20, dob = $21,
                updated_at = NOW()`;
        let params = [
            normalizedFullName, currentEmployeeEmail, normalizedJobRole, departmentNameValue, departmentIdValue, nextManagerId,
            normalizedPhone, joining_date, normalizedSalary,
            normalizedEmployeeCode || null, normalizedDesignation || normalizedJobRole || null, location || null,
            normalizedPan || null, normalizedBankAccount || null, bank_name || null,
            normalizedPersonalEmail || null, normalizedEmergencyContact || null, technology || null,
            normalizedExperienceYears,
            normalizedAadhaar || null,
            dob || null
        ];

        if (avatar_url !== undefined) {
            query += ', avatar_url = $22 WHERE id = $23';
            params.push(avatar_url, req.params.id);
        } else if (req.body.remove_avatar === 'true') {
            query += ', avatar_url = NULL WHERE id = $22';
            params.push(req.params.id);
        } else {
            query += ' WHERE id = $22';
            params.push(req.params.id);
        }

        const result = await pool.query(query + ' RETURNING *', params);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

        if (normalizedAccountRole && targetProfileId) {
            await pool.query(
                'UPDATE profiles SET role = $1, updated_at = NOW() WHERE id = $2',
                [normalizedAccountRole, targetProfileId]
            );
        }

        res.json(result.rows[0]);
    } catch (err) {
        if (
            err?.code === '23505' &&
            (
                String(err?.constraint || '').toLowerCase().includes('employee_id') ||
                String(err?.detail || '').toLowerCase().includes('employee_id')
            )
        ) {
            return res.status(400).json({ error: 'Employee Code already exists' });
        }
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Delete employee (HR only) ──────────────────────────────────
const deleteEmployee = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        const employeeResult = await client.query('SELECT id, email, full_name FROM employees WHERE id = $1', [id]);
        if (employeeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Employee not found' });
        }

        const employee = employeeResult.rows[0];

        const statusResult = await client.query('SELECT status FROM employees WHERE id = $1', [id]);
        const currentStatus = (statusResult.rows[0]?.status || '').toLowerCase();
        if (currentStatus === 'inactive') {
            await client.query('ROLLBACK');
            return res.json({ message: 'Employee is already inactive' });
        }

        // Soft-disable linked login profile created at employee onboarding.
        await client.query(
            "UPDATE profiles SET status = 'inactive', updated_at = NOW() WHERE employee_id = $1 OR email = $2",
            [employee.id, employee.email]
        );

        await client.query(
            "UPDATE employees SET status = 'Inactive', updated_at = NOW() WHERE id = $1",
            [id]
        );

        await sendAccountStatusEmail({
            to: employee.email,
            name: employee.full_name || employee.email,
            status: 'inactive'
        });

        await client.query('COMMIT');
        return res.json({ message: 'Employee marked inactive successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to update employee status. Notification email could not be delivered.' });
    } finally {
        client.release();
    }
};

// ─── Reactivate employee (HR/Admin) ───────────────────────────
const reactivateEmployee = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        const employeeResult = await client.query('SELECT id, email, full_name, status FROM employees WHERE id = $1', [id]);
        if (employeeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Employee not found' });
        }

        const employee = employeeResult.rows[0];
        const currentStatus = String(employee.status || '').toLowerCase();
        if (currentStatus === 'active') {
            await client.query('ROLLBACK');
            return res.json({ message: 'Employee is already active' });
        }

        await client.query(
            "UPDATE profiles SET status = 'active', updated_at = NOW() WHERE employee_id = $1 OR email = $2",
            [employee.id, employee.email]
        );

        await client.query(
            "UPDATE employees SET status = 'Active', updated_at = NOW() WHERE id = $1",
            [id]
        );

        await sendAccountStatusEmail({
            to: employee.email,
            name: employee.full_name || employee.email,
            status: 'active'
        });

        await client.query('COMMIT');
        return res.json({ message: 'Employee reactivated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to update employee status. Notification email could not be delivered.' });
    } finally {
        client.release();
    }
};

module.exports = {
    getEmployees,
    getHrAccounts,
    getDashboardStats,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    reactivateEmployee
};

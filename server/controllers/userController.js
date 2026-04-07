const { Pool } = require('../db');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const mapProfileRoleToEmployeeRole = (role) => {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'admin') return 'Administrator';
    if (normalized === 'hr') return 'HR Manager';
    return 'Employee';
};

const linkProfileToEmployee = async (client, profileId) => {
    const profileRes = await client.query(
        `SELECT id, email, role, employee_id, employee_uuid
         FROM profiles
         WHERE id = $1
         LIMIT 1`,
        [profileId]
    );

    if (profileRes.rows.length === 0) {
        return null;
    }

    const profile = profileRes.rows[0];
    const employeeRes = await client.query(
        `SELECT id, email, employee_id
         FROM employees
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
            OR (
                    $2 IS NOT NULL
                AND employee_id IS NOT NULL
                AND LOWER(TRIM(employee_id)) = LOWER(TRIM($2))
            )
         ORDER BY CASE WHEN LOWER(TRIM(email)) = LOWER(TRIM($1)) THEN 0 ELSE 1 END, updated_at DESC
         LIMIT 1`,
        [profile.email, profile.employee_id || null]
    );

    if (employeeRes.rows.length === 0) {
        return profile;
    }

    const employee = employeeRes.rows[0];
    const profileEmpCode = String(profile.employee_id || '').trim();
    const employeeEmpCode = String(employee.employee_id || '').trim();
    const profileEmployeeUuid = String(profile.employee_uuid || '').trim();
    const employeeUuid = String(employee.id || '').trim();

    if (!employeeEmpCode && profileEmpCode) {
        await client.query(
            `UPDATE employees
             SET employee_id = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [profileEmpCode, employee.id]
        );
    }

    if (employeeEmpCode && profileEmpCode.toLowerCase() !== employeeEmpCode.toLowerCase()) {
        await client.query(
            `UPDATE profiles
             SET employee_id = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [employeeEmpCode, profile.id]
        );
    }

    if (employeeUuid && profileEmployeeUuid !== employeeUuid) {
        await client.query(
            `UPDATE profiles
             SET employee_uuid = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [employeeUuid, profile.id]
        );
    }

    return profile;
};

// ─── Get user profile ────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        await linkProfileToEmployee(pool, req.user.id);

        const result = await pool.query(`
            SELECT p.id, p.email, p.role, p.created_at,
                   COALESCE(e.full_name, p.email) as name,
                   e.avatar_url as "profilePhoto",
                   e.dob,
                   e.address
            FROM profiles p
                        LEFT JOIN employees e
                            ON p.employee_uuid = e.id
                            OR LOWER(TRIM(p.email)) = LOWER(TRIM(e.email))
                            OR (
                                        p.employee_id IS NOT NULL
                                AND e.employee_id IS NOT NULL
                                AND LOWER(TRIM(p.employee_id)) = LOWER(TRIM(e.employee_id))
                            )
            WHERE p.id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update user profile ────────────────────────────────────────
const updateProfile = async (req, res) => {
    const { name, email, role, dob, address, aadhaar_card, adhar_card, pan, pan_card, bank_account, emergency_contact } = req.body;
    const profilePhoto = req.file ? `/uploads/profiles/${req.file.filename}` : undefined;
    const nameValidationRegex = /^[A-Za-z][A-Za-z\s.'-]*$/;
    const allowedRoles = new Set(['admin', 'hr', 'employee']);
    const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
    const aadhaarRegex = /^\d{12}$/;
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
    const bankAccountRegex = /^\d{9,18}$/;
    const emergencyContactRegex = /^\d{10}$/;

    if (typeof name === 'string' && name.trim() && !nameValidationRegex.test(name.trim())) {
        return res.status(400).json({
            error: 'Full Name can contain only alphabets, spaces, apostrophes, dots, and hyphens.'
        });
    }

    if (typeof role === 'string' && role.trim() && !allowedRoles.has(normalizedRole)) {
        return res.status(400).json({ error: 'Invalid role selected.' });
    }

    if (role !== undefined && role !== null && typeof role !== 'string') {
        return res.status(400).json({ error: 'Invalid role selected.' });
    }

    if (dob) {
        const parsedDob = new Date(`${String(dob).trim()}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (Number.isNaN(parsedDob.getTime())) {
            return res.status(400).json({ error: 'Invalid Date of Birth.' });
        }

        if (parsedDob > today) {
            return res.status(400).json({ error: 'Date of Birth cannot be in the future' });
        }
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

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const userResult = await client.query('SELECT email, role FROM profiles WHERE id = $1', [req.user.id]);
        const currentEmail = userResult.rows[0].email;
        const currentRole = String(userResult.rows[0].role || '').toLowerCase();
        const incomingEmail = String(email || '').trim().toLowerCase();
        const normalizedCurrentEmail = String(currentEmail || '').trim().toLowerCase();

        if (incomingEmail && incomingEmail !== normalizedCurrentEmail) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Email cannot be changed once the account is created.' });
        }

        if (normalizedRole && normalizedRole !== currentRole) {
            if (req.user?.role !== 'admin') {
                await client.query('ROLLBACK');
                return res.status(403).json({ error: 'Only admin can change account roles.' });
            }

            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Admin cannot change their own role.' });
        }

        let profileUpdateQuery = 'UPDATE profiles SET updated_at = NOW()';
        let profileParams = [req.user.id];
        let pIdx = 2;

        if (typeof role === 'string' && role.trim()) {
            profileUpdateQuery += `, role = $${pIdx++}`;
            profileParams.push(normalizedRole);
        }
        profileUpdateQuery += ' WHERE id = $1';
        await client.query(profileUpdateQuery, profileParams);

        const empCheck = await client.query(
            `SELECT id
             FROM employees
             WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
             LIMIT 1`,
            [currentEmail]
        );
        if (empCheck.rows.length > 0) {
            let empUpdateQuery = 'UPDATE employees SET updated_at = NOW()';
            let empParams = [currentEmail];
            let eIdx = 2;

            if (name) {
                empUpdateQuery += `, full_name = $${eIdx++}`;
                empParams.push(name.trim());
            }
            if (dob) {
                empUpdateQuery += `, dob = $${eIdx++}`;
                empParams.push(dob);
            }
            if (address) {
                empUpdateQuery += `, address = $${eIdx++}`;
                empParams.push(address);
            }
            if (normalizedAadhaar) {
                empUpdateQuery += `, aadhaar_card = $${eIdx++}`;
                empParams.push(normalizedAadhaar);
            }
            if (normalizedPan) {
                empUpdateQuery += `, pan = $${eIdx++}`;
                empParams.push(normalizedPan);
            }
            if (normalizedBankAccount) {
                empUpdateQuery += `, bank_account = $${eIdx++}`;
                empParams.push(normalizedBankAccount);
            }
            if (normalizedEmergencyContact) {
                empUpdateQuery += `, emergency_contact = $${eIdx++}`;
                empParams.push(normalizedEmergencyContact);
            }
            if (profilePhoto) {
                empUpdateQuery += `, avatar_url = $${eIdx++}`;
                empParams.push(profilePhoto);
            }

            empUpdateQuery += ' WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))';
            await client.query(empUpdateQuery, empParams);
        } else {
            const derivedName = (typeof name === 'string' && name.trim())
                ? name.trim()
                : String(currentEmail || '').split('@')[0] || 'User';

            await client.query(
                `INSERT INTO employees (full_name, email, role, department, status, avatar_url, dob, address, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                [
                    derivedName,
                    currentEmail,
                    mapProfileRoleToEmployeeRole(currentRole),
                    'General',
                    'Active',
                    profilePhoto || null,
                    dob || null,
                    address || null,
                ]
            );
        }

        await linkProfileToEmployee(client, req.user.id);

        await client.query('COMMIT');
        res.json({ message: 'Profile updated successfully', profilePhoto });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

// ─── Change password ─────────────────────────────────────────────
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character.'
        });
    }

    try {
        const userResult = await pool.query('SELECT password_hash FROM profiles WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE profiles SET password_hash = $1, is_first_login = FALSE WHERE id = $2', [hash, req.user.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { getProfile, updateProfile, changePassword };

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID: uuidv4 } = require('crypto');
const { logManualAction } = require('../middleware/auditLogger');
const { sendPasswordResetEmail } = require('../services/emailService');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const MAX_FAILED_ATTEMPTS = 5;

const isBounceEvent = (eventType, eventPayload) => {
    const typeText = String(eventType || '').toLowerCase();
    if (typeText.includes('bounce') || typeText.includes('reject') || typeText.includes('fail') || typeText.includes('complaint')) {
        return true;
    }

    if (eventPayload && typeof eventPayload === 'object') {
        return Boolean(eventPayload.bounce || eventPayload.complaint);
    }

    return false;
};

const extractEmailFromBounceEvent = (event) => {
    if (!event || typeof event !== 'object') return null;

    const direct = event.email || event.recipient || event.to;
    if (direct) return String(direct).trim().toLowerCase();

    const sesDestination = event.mail?.destination;
    if (Array.isArray(sesDestination) && sesDestination.length > 0) {
        return String(sesDestination[0]).trim().toLowerCase();
    }

    const recipients = event.bounce?.bouncedRecipients;
    if (Array.isArray(recipients) && recipients.length > 0) {
        const bouncedEmail = recipients[0]?.emailAddress;
        if (bouncedEmail) return String(bouncedEmail).trim().toLowerCase();
    }

    return null;
};

// ─── Signup (disabled) ───────────────────────────────────────────
const signup = async (req, res) => {
    return res.status(403).json({ error: 'Public signup is disabled. Please contact an admin for account creation.' });
};

// ─── Login ───────────────────────────────────────────────────────
const login = async (req, res) => {
    const { email, password, requestedRole } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    try {
        const result = await pool.query(`
            SELECT p.*, e.full_name 
            FROM profiles p 
            LEFT JOIN employees e ON p.email = e.email 
            WHERE p.email = $1
        `, [normalizedEmail]);

        if (result.rows.length === 0) {
            console.log(`[Login Debug] Email not found: ${normalizedEmail}`);
            return res.status(401).json({ error: 'No account found with this email address.' });
        }

        const user = result.rows[0];
        const normalizedRequestedRole = typeof requestedRole === 'string'
            ? requestedRole.trim().toLowerCase()
            : null;

        if (String(user.status || '').toLowerCase() === 'inactive') {
            return res.status(403).json({
                error: 'Account is inactive. Please contact an admin.'
            });
        }

        if (String(user.status || '').toLowerCase() === 'pending_activation') {
            return res.status(403).json({
                error: 'Account is pending activation. Please complete password setup from your welcome/reset email.'
            });
        }

        if (normalizedRequestedRole && !['admin', 'employee'].includes(normalizedRequestedRole)) {
            return res.status(400).json({ error: 'Invalid login role selected' });
        }

        // Account Lock Check
        if (user.locked_at) {
            const lockDuration = 30 * 60 * 1000;
            const lockedSince = new Date(user.locked_at).getTime();
            if (Date.now() - lockedSince < lockDuration) {
                return res.status(403).json({
                    error: 'Account is locked due to too many failed attempts. Please contact an admin or try again in 30 minutes.'
                });
            } else {
                await pool.query(
                    'UPDATE profiles SET locked_at = NULL, failed_login_attempts = 0 WHERE id = $1',
                    [user.id]
                );
                user.locked_at = null;
                user.failed_login_attempts = 0;
            }
        }

        // Password Check
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log(`[Login Debug] Password mismatch for: ${normalizedEmail}`);
            const newAttempts = (user.failed_login_attempts || 0) + 1;
            if (newAttempts >= MAX_FAILED_ATTEMPTS) {
                await pool.query(
                    'UPDATE profiles SET failed_login_attempts = $1, locked_at = NOW() WHERE id = $2',
                    [newAttempts, user.id]
                );
                return res.status(403).json({
                    error: `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Contact an admin to unlock.`
                });
            }
            await pool.query(
                'UPDATE profiles SET failed_login_attempts = $1 WHERE id = $2',
                [newAttempts, user.id]
            );
            return res.status(401).json({
                error: `Incorrect password. ${MAX_FAILED_ATTEMPTS - newAttempts} attempt(s) remaining before lockout.`
            });
        }

        // Reset failed attempts on success
        await pool.query(
            'UPDATE profiles SET failed_login_attempts = 0, locked_at = NULL, updated_at = NOW() WHERE id = $1',
            [user.id]
        );

        if (normalizedRequestedRole) {
            const allowedRolesForPortal = normalizedRequestedRole === 'admin'
                ? ['admin', 'hr']
                : ['employee'];

            if (!allowedRolesForPortal.includes(user.role)) {
                return res.status(403).json({
                    error: 'Access denied'
                });
            }
        }

        const emp = await pool.query('SELECT id FROM employees WHERE email = $1', [user.email]);
        const employee_uuid = emp.rows[0]?.id || null;

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                email: user.email,
                name: user.full_name || user.email,
                employee_id: user.employee_id || null,
                employee_uuid: employee_uuid
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        await logManualAction({
            email: user.email,
            name: user.full_name || user.email,
            action: 'Login', module: 'Authentication',
            ip: req.ip || req.connection.remoteAddress
        });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
                employee_id: user.employee_id,
                employee_uuid: employee_uuid,
                is_first_login: user.is_first_login ?? true,
                status: user.status
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Logout ──────────────────────────────────────────────────────
const logout = async (req, res) => {
    try {
        const token = req.token;
        const decoded = jwt.decode(token);
        const expiresAt = decoded?.exp
            ? new Date(decoded.exp * 1000)
            : new Date(Date.now() + 8 * 60 * 60 * 1000);

        await pool.query(
            'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
            [token, expiresAt]
        );

        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Change Password ─────────────────────────────────────────────
const changePassword = async (req, res) => {
    const { current_password, new_password } = req.body;
    try {
        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = result.rows[0];

        if (!user.is_first_login) {
            if (!current_password) {
                return res.status(400).json({ error: 'Current password is required' });
            }
            const isMatch = await bcrypt.compare(current_password, user.password_hash);
            if (!isMatch) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(new_password, salt);

        await pool.query(
            'UPDATE profiles SET password_hash = $1, is_first_login = FALSE, updated_at = NOW() WHERE id = $2',
            [password_hash, user.id]
        );

        await logManualAction({
            email: user.email, name: user.email,
            action: 'Password Changed', module: 'Authentication',
            ip: req.ip
        });

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Forgot Password ────────────────────────────────────────────
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const result = await pool.query(
            `SELECT
                p.*,
                e.full_name AS employee_full_name,
                e.email AS employee_email
             FROM profiles p
             LEFT JOIN employees e
               ON LOWER(TRIM(p.email)) = LOWER(TRIM(e.email))
               OR (p.employee_id IS NOT NULL AND p.employee_id = e.employee_id)
             WHERE LOWER(TRIM(p.email)) = $1
                OR LOWER(TRIM(e.email)) = $1
             ORDER BY CASE WHEN LOWER(TRIM(p.email)) = $1 THEN 0 ELSE 1 END
             LIMIT 1`,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            const employeeOnly = await pool.query(
                'SELECT id FROM employees WHERE LOWER(TRIM(email)) = $1 LIMIT 1',
                [normalizedEmail]
            );

            if (employeeOnly.rows.length > 0) {
                return res.status(404).json({
                    error: 'Employee record exists, but no login account is linked yet. Please contact HR/Admin.'
                });
            }

            return res.status(404).json({ error: 'No account found with this email address.' });
        }

        const user = result.rows[0];
        const token = uuidv4();

        await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE profile_id = $1', [user.id]);

        await pool.query(
            "INSERT INTO password_reset_tokens (profile_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
            [user.id, token]
        );

        let baseURL = req.headers.origin || req.headers.referer?.replace(/\/$/, '');
        if (!baseURL || process.env.CLIENT_URL && process.env.CLIENT_URL !== '*') {
            baseURL = baseURL || process.env.CLIENT_URL || 'http://localhost:5173';
        }
        const resetLink = `${baseURL}/reset-password?token=${token}`;

        const name = user.employee_full_name || normalizedEmail.split('@')[0];
        const recipientEmail = String(user.email || normalizedEmail).trim().toLowerCase();

        try {
            await sendPasswordResetEmail({ to: recipientEmail, name, resetLink });
        } catch (emailErr) {
            console.warn('[Email] Password reset email failed (SMTP may not be configured):', emailErr.message);
            console.log(`[Debug] Reset link for ${recipientEmail}: ${resetLink}`);
        }

        res.json({ message: 'Password reset link has been sent to your email address.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Verify Reset Token ──────────────────────────────────────────
const verifyResetToken = async (req, res) => {
    const { token } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Reset link is invalid or has expired' });
        }

        res.json({ valid: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Reset Password ─────────────────────────────────────────────
const resetPassword = async (req, res) => {
    const { token, new_password } = req.body;
    try {
        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const result = await pool.query(
            'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Reset link is invalid or has expired' });
        }

        const resetRecord = result.rows[0];
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(new_password, salt);

        await pool.query(
            'UPDATE profiles SET password_hash = $1, is_first_login = FALSE, status = $3, updated_at = NOW() WHERE id = $2',
            [password_hash, resetRecord.profile_id, 'active']
        );

        await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetRecord.id]);

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Bounce Webhook (auto deactivate on bounce) ────────────────
const handleEmailBounceWebhook = async (req, res) => {
    try {
        const configuredSecret = String(process.env.BOUNCE_WEBHOOK_SECRET || '').trim();
        if (!configuredSecret) {
            return res.status(503).json({ error: 'Bounce webhook is not configured' });
        }

        const providedSecret = String(req.headers['x-bounce-secret'] || '').trim();
        if (!providedSecret || providedSecret !== configuredSecret) {
            return res.status(403).json({ error: 'Unauthorized bounce webhook call' });
        }

        let rawPayload = req.body;
        if (rawPayload && rawPayload.Type === 'Notification' && typeof rawPayload.Message === 'string') {
            try {
                rawPayload = JSON.parse(rawPayload.Message);
            } catch (_) {
                // Keep raw payload as-is when SNS wrapper message is not JSON.
            }
        }

        const events = Array.isArray(rawPayload)
            ? rawPayload
            : [rawPayload];

        let processedEvents = 0;
        const deactivatedEmails = [];

        for (const event of events) {
            const eventType = event?.event || event?.type || event?.notificationType || event?.bounce?.bounceType;
            if (!isBounceEvent(eventType, event)) continue;

            const bouncedEmail = extractEmailFromBounceEvent(event);
            if (!bouncedEmail) continue;

            const profileResult = await pool.query(
                `UPDATE profiles
                 SET status = 'inactive', updated_at = NOW()
                 WHERE LOWER(TRIM(email)) = $1
                 RETURNING employee_id, email`,
                [bouncedEmail]
            );

            if (profileResult.rows.length === 0) continue;

            processedEvents += 1;
            deactivatedEmails.push(bouncedEmail);

            for (const row of profileResult.rows) {
                const linkedEmployeeId = row.employee_id || null;
                if (linkedEmployeeId) {
                    await pool.query(
                        `UPDATE employees
                         SET status = 'Inactive', updated_at = NOW()
                         WHERE id::text = $1`,
                        [linkedEmployeeId]
                    );
                }

                await pool.query(
                    `UPDATE employees
                     SET status = 'Inactive', updated_at = NOW()
                     WHERE LOWER(TRIM(email)) = $1`,
                    [bouncedEmail]
                );
            }
        }

        res.json({
            message: 'Bounce webhook processed',
            processed_events: processedEvents,
            deactivated_emails: deactivatedEmails
        });
    } catch (err) {
        console.error('[Bounce Webhook] Failed:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get current user ────────────────────────────────────────────
const getMe = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.id, p.email, p.role, p.employee_id, p.is_first_login, p.status,
                   COALESCE(e.full_name, p.email) AS full_name,
                   e.department, e.avatar_url,
                   e.id AS employee_uuid
            FROM profiles p
            LEFT JOIN employees e ON p.email = e.email
                                  OR (p.employee_id IS NOT NULL AND p.employee_id::text = e.id::text)
            WHERE p.id = $1
        `, [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    signup,
    login,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyResetToken,
    getMe,
    handleEmailBounceWebhook
};

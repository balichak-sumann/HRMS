const { Pool } = require('../db');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Audit Logging Middleware
 * Captured actions: login, logout, create, edit, delete, approve, reject
 * Usage: router.use(auditLogger('Module Name'));
 */
const auditLogger = (moduleName) => async (req, res, next) => {
    // We only log non-GET requests as they are mutations
    if (req.method === 'GET' || !req.user) {
        return next();
    }

    // Wrap res.send or res.json to capture when the request is actually successfull
    const originalSend = res.send;
    res.send = function (data) {
        // Only log if the request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
            logAction(req, moduleName).catch(err => console.error('Audit Log Error:', err));
        }
        return originalSend.apply(res, arguments);
    };

    next();
};

const logAction = async (req, moduleName) => {
    const userEmail = req.user.email;
    const fullName = req.user.name || 'System User';
    const ipAddress = normalizeIp(req.ip || req.connection.remoteAddress || 'Unknown');

    let action = 'Unknown';
    switch (req.method) {
        case 'POST': action = 'Create'; break;
        case 'PATCH':
        case 'PUT':
            // Check if it's an approval/rejection
            if (req.body.status) action = req.body.status;
            else action = 'Edit';
            break;
        case 'DELETE': action = 'Delete'; break;
    }

    // Special case for login/logout (passed manually from routes)
    if (req.auditAction) {
        action = req.auditAction;
    }

    const query = `
        INSERT INTO audit_logs (user_email, full_name, action, module, ip_address, details)
        VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const params = [userEmail, fullName, action, moduleName, ipAddress, JSON.stringify(req.body)];

    await pool.query(query, params);
};

// Manual logging function for auth actions
const logManualAction = async ({ email, name, action, module, ip, details }) => {
    try {
        const normalizedIp = normalizeIp(ip);
        const query = `
            INSERT INTO audit_logs (user_email, full_name, action, module, ip_address, details)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await pool.query(query, [email, name, action, module, normalizedIp, details ? JSON.stringify(details) : null]);
    } catch (err) {
        console.error('Manual Audit Log Error:', err);
    }
};

const normalizeIp = (ip) => {
    if (!ip) return 'Unknown';
    if (ip === '::1') return '127.0.0.1';
    if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
    return ip;
};

module.exports = { auditLogger, logManualAction, normalizeIp };

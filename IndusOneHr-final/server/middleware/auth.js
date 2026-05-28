const jwt = require('jsonwebtoken');
const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * authenticateToken — verifies JWT and checks against blacklist
 */
const auth = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if token is blacklisted (logged out)
        const blacklisted = await pool.query(
            'SELECT id FROM token_blacklist WHERE token = $1 AND expires_at > NOW()',
            [token]
        );
        if (blacklisted.rows.length > 0) {
            return res.status(401).json({ error: 'Token has been invalidated. Please log in again.' });
        }

        // Check if user account is still active
        const profileCheck = await pool.query(
            'SELECT status FROM profiles WHERE id = $1',
            [decoded.id]
        );
        const profileStatus = String(profileCheck.rows[0]?.status || '').toLowerCase();
        if (profileStatus === 'inactive') {
            return res.status(403).json({ error: 'ACCOUNT_DEACTIVATED', message: 'Your account has been deactivated. Please contact an administrator.' });
        }

        req.user = decoded;
        req.token = token; // Attach token so logout route can blacklist it
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * authorize — role-based access control
 */
const authorize = (roles = []) => {
    return (req, res, next) => {
        const allowedRoles = new Set(roles);
        const isAdmin = ['admin', 'Super Admin'].includes(req.user.role);
        const hasHrInheritedAccess = isAdmin && allowedRoles.has('hr');

        if (allowedRoles.size && !allowedRoles.has(req.user.role) && !hasHrInheritedAccess && req.user.role !== 'Super Admin') {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

module.exports = { auth, authorize };

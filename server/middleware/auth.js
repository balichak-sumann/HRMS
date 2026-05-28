const jwt = require('jsonwebtoken');
const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Simple in-memory cache to reduce DB queries per request
const profileStatusCache = new Map(); // key: profileId, value: { status, expiresAt }
const CACHE_TTL_MS = 60 * 1000; // 1 minute

const getCachedProfileStatus = (profileId) => {
    const cached = profileStatusCache.get(profileId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.status;
    }
    profileStatusCache.delete(profileId);
    return null;
};

const setCachedProfileStatus = (profileId, status) => {
    profileStatusCache.set(profileId, { status, expiresAt: Date.now() + CACHE_TTL_MS });
    // Evict old entries periodically
    if (profileStatusCache.size > 10000) {
        const now = Date.now();
        for (const [key, val] of profileStatusCache) {
            if (val.expiresAt <= now) profileStatusCache.delete(key);
        }
    }
};

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

        // Check if user account is still active (with cache)
        let profileStatus = getCachedProfileStatus(decoded.id);
        if (profileStatus === null) {
            const profileCheck = await pool.query(
                'SELECT status FROM profiles WHERE id = $1',
                [decoded.id]
            );
            profileStatus = String(profileCheck.rows[0]?.status || '').toLowerCase();
            setCachedProfileStatus(decoded.id, profileStatus);
        }

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

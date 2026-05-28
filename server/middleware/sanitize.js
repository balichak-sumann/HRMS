/**
 * Input Sanitization Middleware
 * Prevents XSS, trims whitespace, limits string lengths, strips dangerous characters
 */

const MAX_STRING_LENGTH = 500;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 190;
const MAX_TEXT_LENGTH = 5000;

const DANGEROUS_PATTERNS = [
    /<script[\s>]/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
];

const containsDangerousContent = (value) => {
    if (typeof value !== 'string') return false;
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(value));
};

const sanitizeValue = (value, maxLen = MAX_STRING_LENGTH) => {
    if (typeof value !== 'string') return value;
    // Trim whitespace
    let cleaned = value.trim();
    // Truncate to max length
    if (cleaned.length > maxLen) {
        cleaned = cleaned.slice(0, maxLen);
    }
    // Remove null bytes
    cleaned = cleaned.replace(/\0/g, '');
    return cleaned;
};

const sanitizeObject = (obj, depth = 0) => {
    if (depth > 5) return obj; // prevent infinite recursion
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item, depth + 1));

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Determine max length based on field name
            let maxLen = MAX_STRING_LENGTH;
            if (key.includes('name') || key.includes('title')) maxLen = MAX_NAME_LENGTH;
            if (key.includes('email')) maxLen = MAX_EMAIL_LENGTH;
            if (key.includes('description') || key.includes('content') || key.includes('reason') || key.includes('feedback') || key.includes('comment')) maxLen = MAX_TEXT_LENGTH;

            result[key] = sanitizeValue(value, maxLen);
        } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeObject(value, depth + 1);
        } else {
            result[key] = value;
        }
    }
    return result;
};

/**
 * Express middleware that sanitizes req.body
 */
const sanitizeInput = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        // Check for XSS/injection attempts
        const bodyStr = JSON.stringify(req.body);
        if (containsDangerousContent(bodyStr)) {
            return res.status(400).json({ error: 'Input contains potentially dangerous content' });
        }

        // Sanitize all string values
        req.body = sanitizeObject(req.body);
    }

    // Sanitize query params
    if (req.query && typeof req.query === 'object') {
        for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
                req.query[key] = sanitizeValue(value);
            }
        }
    }

    next();
};

module.exports = { sanitizeInput, sanitizeValue, containsDangerousContent };

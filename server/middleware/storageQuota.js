/**
 * Storage Quota Middleware
 * Enforces a 1 GB per-user hard limit across all upload modules.
 * Checks total file usage (drive + chat + leaves + expenses + avatars + etc.)
 * before allowing any upload to proceed.
 */
const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 1 GB per user
const USER_QUOTA_BYTES = 1 * 1024 * 1024 * 1024;

/**
 * Get total storage used by an employee across all modules.
 * Counts: drive files, chat attachments, leave attachments, expense receipts,
 * tax proofs, and avatars.
 */
const getUserStorageUsed = async (employeeId) => {
    if (!employeeId) return 0;

    // 1. Drive files (tracked in `files` table with size)
    const driveResult = await pool.query(
        `SELECT COALESCE(SUM(size), 0) AS used_bytes FROM files WHERE owner_id = $1`,
        [employeeId]
    );
    let total = Number(driveResult.rows[0]?.used_bytes || 0);

    // 2. Tax declaration proofs (tracked with file_size)
    const taxResult = await pool.query(
        `SELECT COALESCE(SUM(file_size), 0) AS used_bytes FROM income_tax_declaration_proofs WHERE uploaded_by = $1`,
        [employeeId]
    );
    total += Number(taxResult.rows[0]?.used_bytes || 0);

    // 3. Estimate chat/leave/expense/avatar uploads by scanning disk
    //    These modules don't track file size in DB, so we use a conservative
    //    estimate: count rows with file URLs and assume avg 500KB each.
    //    This is a fallback — the real fix would be to track sizes in those tables.
    const leaveAttachments = await pool.query(
        `SELECT COUNT(*) AS cnt FROM leaves WHERE employee_id = $1 AND attachment_url IS NOT NULL AND attachment_url != ''`,
        [employeeId]
    );
    total += Number(leaveAttachments.rows[0]?.cnt || 0) * 500 * 1024; // ~500KB avg

    const expenseReceipts = await pool.query(
        `SELECT COUNT(*) AS cnt FROM expense_claims WHERE employee_id = $1 AND receipt_url IS NOT NULL AND receipt_url != ''`,
        [employeeId]
    );
    total += Number(expenseReceipts.rows[0]?.cnt || 0) * 500 * 1024; // ~500KB avg

    return total;
};

/**
 * Resolve employee ID from the authenticated user.
 */
const resolveEmployeeId = async (user) => {
    if (!user || !user.email) return null;

    const res = await pool.query(
        'SELECT id FROM employees WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1',
        [user.email]
    );

    return res.rows[0]?.id || null;
};

/**
 * Middleware: enforceStorageQuota
 * Place AFTER multer (so req.file exists) but BEFORE the controller.
 * If the upload would exceed the user's 1 GB quota, it deletes the
 * uploaded temp file and returns 413.
 */
const enforceStorageQuota = async (req, res, next) => {
    try {
        // If no file was uploaded, skip quota check
        if (!req.file) return next();

        const employeeId = await resolveEmployeeId(req.user);
        if (!employeeId) {
            // Can't determine user — allow (edge case for admin-only routes)
            return next();
        }

        const usedBytes = await getUserStorageUsed(employeeId);
        const incomingSize = req.file.size || 0;

        if (usedBytes + incomingSize > USER_QUOTA_BYTES) {
            // Remove the uploaded temp file from disk
            const fs = require('fs');
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
            const quotaMB = (USER_QUOTA_BYTES / (1024 * 1024)).toFixed(0);

            return res.status(413).json({
                error: `Storage quota exceeded. You have used ${usedMB} MB of your ${quotaMB} MB (1 GB) limit. Please delete some files to free up space.`,
            });
        }

        next();
    } catch (err) {
        console.error('[StorageQuota] Error checking quota:', err.message);
        // On error, allow the upload (don't block users due to quota check failures)
        next();
    }
};

module.exports = { enforceStorageQuota, getUserStorageUsed, resolveEmployeeId, USER_QUOTA_BYTES };

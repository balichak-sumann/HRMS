const { Pool } = require('../db');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Helper to get employee ID
const getEmpId = async (email) => {
    const res = await pool.query('SELECT id FROM employees WHERE email = $1', [email]);
    return res.rows[0]?.id;
};

const canManageFolder = (folder, myId, role) => {
    if (!folder) return false;
    if (['hr', 'admin'].includes(role)) return true;
    return String(folder.owner_id) === String(myId);
};

// ─── Get drive contents ──────────────────────────────────────────
const getContents = async (req, res) => {
    const { folder_id, type } = req.query;
    try {
        const myId = await getEmpId(req.user.email);
        if (!myId) return res.status(404).json({ error: 'Profile not found' });

        let folderQuery = '';
        let fileQuery = '';
        let params = [];

        if (type === 'my') {
            folderQuery = 'SELECT * FROM folders WHERE owner_id = $1 AND parent_id ' + (folder_id ? '= $2' : 'IS NULL') + ' AND is_company = FALSE AND is_hr_only = FALSE';
            fileQuery = 'SELECT * FROM files WHERE owner_id = $1 AND folder_id ' + (folder_id ? '= $2' : 'IS NULL');
            params = folder_id ? [myId, folder_id] : [myId];
        } else if (type === 'company') {
            folderQuery = 'SELECT * FROM folders WHERE is_company = TRUE AND parent_id ' + (folder_id ? '= $1' : 'IS NULL');
            fileQuery = 'SELECT * FROM files WHERE folder_id ' + (folder_id ? '= $1' : 'IS NULL') + ' AND folder_id IN (SELECT id FROM folders WHERE is_company = TRUE)';
            params = folder_id ? [folder_id] : [];
        } else if (type === 'hr') {
            if (!['hr', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
            folderQuery = 'SELECT * FROM folders WHERE is_hr_only = TRUE AND parent_id ' + (folder_id ? '= $1' : 'IS NULL');
            fileQuery = 'SELECT * FROM files WHERE folder_id ' + (folder_id ? '= $1' : 'IS NULL') + ' AND folder_id IN (SELECT id FROM folders WHERE is_hr_only = TRUE)';
            params = folder_id ? [folder_id] : [];
        } else if (type === 'shared') {
            folderQuery = 'SELECT NULL LIMIT 0';
            fileQuery = `
                SELECT f.* FROM files f
                JOIN file_shares fs ON f.id = fs.file_id
                WHERE fs.employee_id = $1
            `;
            params = [myId];
        }

        const [folders, files] = await Promise.all([
            pool.query(folderQuery, params),
            pool.query(fileQuery, params)
        ]);

        res.json({ folders: folders.rows, files: files.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get storage usage (real data) ─────────────────────────────
const getStorageUsage = async (req, res) => {
    try {
        const myId = await getEmpId(req.user.email);
        if (!myId) return res.status(404).json({ error: 'Profile not found' });

        // Drive files
        const driveResult = await pool.query(
            `SELECT COALESCE(SUM(size), 0) AS used_bytes FROM files WHERE owner_id = $1`,
            [myId]
        );
        let usedBytes = Number(driveResult.rows[0]?.used_bytes || 0);

        // Tax proofs
        const taxResult = await pool.query(
            `SELECT COALESCE(SUM(file_size), 0) AS used_bytes FROM income_tax_declaration_proofs WHERE uploaded_by = $1`,
            [myId]
        );
        usedBytes += Number(taxResult.rows[0]?.used_bytes || 0);

        // Estimate leave/expense attachments (~500KB each)
        const leaveResult = await pool.query(
            `SELECT COUNT(*) AS cnt FROM leaves WHERE employee_id = $1 AND attachment_url IS NOT NULL AND attachment_url != ''`,
            [myId]
        );
        usedBytes += Number(leaveResult.rows[0]?.cnt || 0) * 500 * 1024;

        const expenseResult = await pool.query(
            `SELECT COUNT(*) AS cnt FROM expense_claims WHERE employee_id = $1 AND receipt_url IS NOT NULL AND receipt_url != ''`,
            [myId]
        );
        usedBytes += Number(expenseResult.rows[0]?.cnt || 0) * 500 * 1024;

        // 1 GB per user quota
        const quotaBytes = 1 * 1024 * 1024 * 1024;

        res.json({ used_bytes: usedBytes, quota_bytes: quotaBytes });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Upload file ─────────────────────────────────────────────────
const uploadFile = async (req, res) => {
    try {
        const myId = await getEmpId(req.user.email);
        const { folder_id } = req.body;

        const result = await pool.query(
            'INSERT INTO files (name, folder_id, owner_id, size, mime_type, storage_path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.file.originalname, folder_id || null, myId, req.file.size, req.file.mimetype, req.file.path]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create folder ───────────────────────────────────────────────
const createFolder = async (req, res) => {
    const { name, parent_id, is_company, is_hr_only } = req.body;
    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Folder name is required' });
    }
    try {
        const myId = await getEmpId(req.user.email);

        const result = await pool.query(
            'INSERT INTO folders (name, parent_id, owner_id, is_company, is_hr_only) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, parent_id || null, myId, is_company || false, is_hr_only || false]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Rename folder ───────────────────────────────────────────────
const renameFolder = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Folder name is required' });
    }

    try {
        const myId = await getEmpId(req.user.email);
        if (!myId) return res.status(404).json({ error: 'Profile not found' });

        const folderRes = await pool.query('SELECT * FROM folders WHERE id = $1', [id]);
        if (folderRes.rows.length === 0) return res.status(404).json({ error: 'Folder not found' });

        const folder = folderRes.rows[0];
        if (!canManageFolder(folder, myId, req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updated = await pool.query(
            'UPDATE folders SET name = $1 WHERE id = $2 RETURNING *',
            [String(name).trim(), id]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Delete folder (recursive) ───────────────────────────────────
const deleteFolder = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        const myId = await getEmpId(req.user.email);
        if (!myId) return res.status(404).json({ error: 'Profile not found' });

        await client.query('BEGIN');

        const folderRes = await client.query('SELECT * FROM folders WHERE id = $1', [id]);
        if (folderRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Folder not found' });
        }

        const folder = folderRes.rows[0];
        if (!canManageFolder(folder, myId, req.user.role)) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Access denied' });
        }

        // Gather files in the folder subtree so physical files can be removed from disk.
        // Build folder tree using application-level recursion (replaces WITH RECURSIVE)
        const folderIds = [id];
        const allFolderIds = new Set();
        
        while (folderIds.length > 0) {
            const folderId = folderIds.shift();
            if (allFolderIds.has(folderId)) continue;
            allFolderIds.add(folderId);
            
            const childFolders = await client.query(
                'SELECT id FROM folders WHERE parent_id = $1',
                [folderId]
            );
            
            for (const child of childFolders.rows) {
                folderIds.push(child.id);
            }
        }

        // Fetch all files in the folder tree
        const folderArray = Array.from(allFolderIds);
        let filesRes = { rows: [] };
        if (folderArray.length > 0) {
            filesRes = await client.query(
                `SELECT storage_path
                 FROM files
                 WHERE folder_id = ANY($1)`,
                [folderArray]
            );
        }

        await client.query('DELETE FROM folders WHERE id = $1', [id]);
        await client.query('COMMIT');

        for (const row of filesRes.rows) {
            if (!row.storage_path) continue;
            const fullPath = path.join(__dirname, '..', row.storage_path);
            if (fs.existsSync(fullPath)) {
                try {
                    fs.unlinkSync(fullPath);
                } catch (fileErr) {
                    console.warn('[Drive] Failed to remove file from disk:', fileErr.message);
                }
            }
        }

        res.json({ message: 'Folder deleted' });
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (_) {
            // ignore rollback failures
        }
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

// ─── Delete file ─────────────────────────────────────────────────
const deleteFile = async (req, res) => {
    try {
        const myId = await getEmpId(req.user.email);
        const file = await pool.query('SELECT * FROM files WHERE id = $1', [req.params.id]);

        if (file.rows.length === 0) return res.status(404).json({ error: 'File not found' });
        if (file.rows[0].owner_id !== myId && !['hr', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });

        if (fs.existsSync(file.rows[0].storage_path)) {
            fs.unlinkSync(file.rows[0].storage_path);
        }

        await pool.query('DELETE FROM files WHERE id = $1', [req.params.id]);
        res.json({ message: 'File deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Download file ───────────────────────────────────────────────
const downloadFile = async (req, res) => {
    try {
        const file = await pool.query('SELECT * FROM files WHERE id = $1', [req.params.id]);
        if (file.rows.length === 0) return res.status(404).json({ error: 'File not found' });

        const filePath = path.join(__dirname, '..', file.rows[0].storage_path);
        res.download(filePath, file.rows[0].name);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { getContents, getStorageUsage, uploadFile, createFolder, renameFolder, deleteFolder, deleteFile, downloadFile };

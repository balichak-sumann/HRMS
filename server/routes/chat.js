const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const { enforceStorageQuota } = require('../middleware/storageQuota');
const chatController = require('../controllers/chatController');

// Ensure upload directory exists
const chatUploadDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, chatUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.get('/contacts', auth, chatController.getContacts);
router.get('/groups', auth, chatController.getGroups);
router.get('/groups/:groupId/members', auth, chatController.getGroupMembers);
router.post('/create-group', auth, chatController.createGroup);
router.post('/add-members', auth, chatController.addMembers);
router.post('/leave-group', auth, chatController.leaveGroup);
router.get('/history/:targetId', auth, chatController.getHistory);
router.delete('/history/:targetId', auth, chatController.clearHistory);
router.post('/message', auth, chatController.sendMessage);

// File Upload Route
router.post('/upload', auth, upload.single('file'), enforceStorageQuota, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/chat/${req.file.filename}`;

    // Track in files table for quota accounting
    try {
        const { Pool } = require('../db');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const empRes = await pool.query('SELECT id FROM employees WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [req.user.email]);
        const ownerId = empRes.rows[0]?.id || null;
        if (ownerId) {
            await pool.query(
                'INSERT INTO files (name, folder_id, owner_id, size, mime_type, storage_path) VALUES ($1, $2, $3, $4, $5, $6)',
                [req.file.originalname, null, ownerId, req.file.size, req.file.mimetype, req.file.path]
            );
        }
    } catch (trackErr) {
        console.warn('[Chat Upload] Failed to track file in DB:', trackErr.message);
    }

    res.json({ url: fileUrl });
});

module.exports = router;

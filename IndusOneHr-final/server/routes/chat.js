const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { auth } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/chat/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

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
router.post('/upload', auth, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ url: fileUrl });
});

module.exports = router;

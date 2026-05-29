const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const { enforceStorageQuota } = require('../middleware/storageQuota');
const driveController = require('../controllers/driveController');

router.use(auth);
router.use(auditLogger('Cloud Drive'));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/drive';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.get('/contents', driveController.getContents);
router.get('/storage-usage', driveController.getStorageUsage);
router.post('/upload', upload.single('file'), enforceStorageQuota, driveController.uploadFile);
router.post('/folder', driveController.createFolder);
router.patch('/folders/:id', driveController.renameFolder);
router.delete('/folders/:id', driveController.deleteFolder);
router.delete('/files/:id', driveController.deleteFile);
router.get('/download/:id', driveController.downloadFile);

module.exports = router;

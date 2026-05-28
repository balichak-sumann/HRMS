const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const leaveController = require('../controllers/leaveController');

// Configure Multer - ensure directory exists
const leavesUploadDir = path.join(__dirname, '..', 'uploads', 'leaves');
if (!fs.existsSync(leavesUploadDir)) {
    fs.mkdirSync(leavesUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, leavesUploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, Date.now() + '-' + safeName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, PNG, DOC, DOCX files are allowed'));
        }
    }
});

router.use(auditLogger('Leave Management'));

router.get('/', auth, leaveController.getLeaves);
router.post('/', auth, upload.single('attachment'), leaveController.createLeave);
router.patch('/:id', auth, authorize(['hr']), leaveController.updateLeaveStatus);

module.exports = router;

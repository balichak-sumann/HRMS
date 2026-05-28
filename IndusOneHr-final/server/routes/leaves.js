const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const leaveController = require('../controllers/leaveController');

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/leaves/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

router.use(auditLogger('Leave Management'));

router.get('/', auth, leaveController.getLeaves);
router.post('/', auth, upload.single('attachment'), leaveController.createLeave);
router.patch('/:id', auth, authorize(['hr']), leaveController.updateLeaveStatus);

module.exports = router;

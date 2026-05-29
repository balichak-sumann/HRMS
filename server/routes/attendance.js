const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

// Multer for check-in photo
const attendanceDir = path.join(__dirname, '..', 'uploads', 'attendance');
if (!fs.existsSync(attendanceDir)) fs.mkdirSync(attendanceDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, attendanceDir),
    filename: (req, file, cb) => {
        cb(null, `checkin-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname) || '.jpg'}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/check-in', auth, upload.single('photo'), attendanceController.checkIn);
router.post('/check-out', auth, upload.single('photo'), attendanceController.checkOut);
router.post('/create', auth, attendanceController.createAttendance);
router.get('/my', auth, attendanceController.getMyAttendance);
router.get('/all', auth, attendanceController.getAllAttendance);
router.get('/monthly-export', auth, attendanceController.getMonthlyAttendanceExport);
router.put('/:attendance_id', auth, attendanceController.updateAttendance);

module.exports = router;

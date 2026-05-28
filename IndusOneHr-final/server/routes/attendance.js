const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

router.post('/check-in', auth, attendanceController.checkIn);
router.post('/check-out', auth, attendanceController.checkOut);
router.post('/create', auth, attendanceController.createAttendance);
router.get('/my', auth, attendanceController.getMyAttendance);
router.get('/all', auth, attendanceController.getAllAttendance);
router.get('/monthly-export', auth, attendanceController.getMonthlyAttendanceExport);
router.put('/:attendance_id', auth, attendanceController.updateAttendance);

module.exports = router;

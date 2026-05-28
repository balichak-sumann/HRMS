const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const shiftController = require('../controllers/shiftController');

router.use(auth);

router.get('/my-current', authorize(['employee']), shiftController.getMyCurrentShift);

router.get('/', authorize(['hr']), shiftController.getShifts);
router.post('/', authorize(['hr']), shiftController.createShift);
router.post('/assign/employee', authorize(['hr']), shiftController.assignShiftToEmployee);
router.post('/assign/department', authorize(['hr']), shiftController.assignShiftToDepartment);
router.get('/roster/weekly', authorize(['hr']), shiftController.getWeeklyRoster);

module.exports = router;

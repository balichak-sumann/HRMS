const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const holidayController = require('../controllers/holidayController');

router.get('/', auth, holidayController.getHolidays);
router.post('/', auth, authorize(['admin']), holidayController.createHoliday);

module.exports = router;

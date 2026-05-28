const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

router.get('/', auth, authorize(['hr']), analyticsController.getAnalytics);
router.post('/celebrations/:employeeId/message', auth, authorize(['hr']), analyticsController.sendCelebrationMessage);

module.exports = router;

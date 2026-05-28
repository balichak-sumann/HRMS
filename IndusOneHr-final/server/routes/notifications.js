const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/', auth, notificationController.getMyNotifications);
router.patch('/read', auth, notificationController.markAllAsRead);
router.patch('/:id/read', auth, notificationController.markOneAsRead);

module.exports = router;

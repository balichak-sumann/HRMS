const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const announcementController = require('../controllers/announcementController');

router.get('/', auth, announcementController.getAnnouncements);
router.post('/', auth, announcementController.createAnnouncement);
router.delete('/:id', auth, authorize(['hr', 'admin']), announcementController.deleteAnnouncement);

module.exports = router;

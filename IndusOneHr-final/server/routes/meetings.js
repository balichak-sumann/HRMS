const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const meetingController = require('../controllers/meetingController');

router.use(auditLogger('Meetings'));

router.post('/', auth, meetingController.createMeeting);
router.get('/', auth, meetingController.getMeetings);
router.get('/:id', auth, meetingController.getMeetingById);
router.put('/:id/end', auth, meetingController.endMeeting);
router.post('/:id/add-participant', auth, meetingController.addParticipant);

module.exports = router;

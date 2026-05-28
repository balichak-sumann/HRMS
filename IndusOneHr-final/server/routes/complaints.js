const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const complaintController = require('../controllers/complaintController');

router.use(auditLogger('Complaint Box'));

router.post('/', auth, complaintController.createComplaint);
router.get('/', auth, complaintController.getComplaints);
router.patch('/:id', auth, authorize(['hr']), complaintController.updateComplaintStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const leaveEncashmentController = require('../controllers/leaveEncashmentController');

router.use(auth);

router.get('/my/summary', authorize(['employee']), leaveEncashmentController.getMyEncashmentSummary);
router.get('/my/requests', authorize(['employee']), leaveEncashmentController.getMyEncashmentRequests);
router.post('/my/requests', authorize(['employee']), leaveEncashmentController.createEncashmentRequest);

router.get('/policy', authorize(['hr']), leaveEncashmentController.getPolicy);
router.put('/policy', authorize(['hr']), leaveEncashmentController.updatePolicy);
router.get('/requests', authorize(['hr']), leaveEncashmentController.getEncashmentRequestsForHR);
router.patch('/requests/:id', authorize(['hr']), leaveEncashmentController.reviewEncashmentRequest);

module.exports = router;

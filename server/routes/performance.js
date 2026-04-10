const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const performanceController = require('../controllers/performanceController');

router.use(auth);
router.use(auditLogger('Performance Management'));

router.get('/cycles', performanceController.getCycles);
router.post('/cycles', authorize(['hr']), performanceController.createCycle);
router.patch('/cycles/:id/status', authorize(['hr']), performanceController.updateCycleStatus);
router.post('/cycles/:id/participants', authorize(['hr']), performanceController.addParticipant);

router.get('/dashboard', authorize(['hr']), performanceController.getHRDashboard);
router.get('/my-overview', performanceController.getMyOverview);

router.get('/goals', performanceController.getGoals);
router.post('/goals', authorize(['hr', 'admin', 'Super Admin']), performanceController.createGoal);
router.patch('/goals/:id', authorize(['hr', 'admin', 'Super Admin']), performanceController.updateGoal);
router.patch('/goals/:id/progress', authorize(['employee']), performanceController.updateGoalProgress);

router.post('/self-appraisal', authorize(['employee', 'hr']), performanceController.submitSelfAppraisal);
router.get('/manager-appraisal', authorize(['employee', 'hr', 'admin', 'Super Admin']), performanceController.getManagerAppraisal);
router.post('/manager-appraisal', authorize(['employee', 'hr']), performanceController.submitManagerAppraisal);
router.post('/respond', authorize(['employee', 'hr']), performanceController.respondToAppraisal);

router.post('/peer-feedback', authorize(['employee']), performanceController.submitPeerFeedback);
router.get('/peer-feedback', performanceController.getPeerFeedback);

module.exports = router;

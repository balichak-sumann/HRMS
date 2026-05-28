const express = require('express');
const router = express.Router();

const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const offboardingController = require('../controllers/offboardingController');

router.use(auth);
router.use(auditLogger('Employee Offboarding'));

router.post('/cases', authorize(['hr']), offboardingController.startOffboarding);
router.get('/cases', authorize(['hr']), offboardingController.getCasesForHR);
router.get('/cases/:id', authorize(['hr']), offboardingController.getCaseDetailsForHR);
router.patch('/cases/:caseId/items/:itemId/assignment', authorize(['hr']), offboardingController.updateChecklistAssignment);
router.post('/cases/:id/finalize', authorize(['hr']), offboardingController.finalizeOffboarding);

router.patch('/checklist/:itemId/clear', authorize(['hr', 'employee']), offboardingController.markChecklistItem);

router.get('/my/case', authorize(['employee']), offboardingController.getMyCase);
router.post('/my/exit-interview', authorize(['employee']), offboardingController.submitExitInterview);

module.exports = router;

const express = require('express');

const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const salaryRevisionController = require('../controllers/salaryRevisionController');

const router = express.Router();

router.use(auth);
router.use(auditLogger('Salary Revision Workflow'));

router.post('/', authorize(['hr', 'super-admin']), salaryRevisionController.initiateRevision);
router.get('/pending', authorize(['hr', 'super-admin']), salaryRevisionController.listPendingApprovals);
router.patch('/:id/decision', authorize(['hr', 'super-admin']), salaryRevisionController.decideRevision);
router.get('/employee/:employeeId/history', authorize(['hr', 'super-admin']), salaryRevisionController.getEmployeeRevisionHistoryForHR);
router.patch('/employee/:employeeId/history-visibility', authorize(['hr', 'super-admin']), salaryRevisionController.setHistoryVisibility);

router.get('/my/current', authorize(['employee']), salaryRevisionController.getMyCurrentSalaryStructure);
router.get('/my/history', authorize(['employee']), salaryRevisionController.getMySalaryRevisionHistory);

module.exports = router;

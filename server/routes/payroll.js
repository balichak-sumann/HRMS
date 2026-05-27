const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const payrollController = require('../controllers/payrollController');

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 15 * 1024 * 1024 }
});

router.use(auditLogger('Payroll'));

router.get('/', auth, payrollController.getPayroll);
router.get('/attendance-metrics', auth, authorize(['hr']), payrollController.getPayrollAttendanceMetrics);
router.get('/statutory-settings', auth, payrollController.getStatutorySettings);
router.put('/statutory-settings', auth, authorize(['admin']), payrollController.updateStatutorySettings);
router.get('/compliance-report', auth, authorize(['hr']), payrollController.getMonthlyComplianceReport);
router.post('/', auth, authorize(['hr']), payrollController.createPayroll);
router.post('/:id/send', auth, authorize(['hr']), upload.single('payslipPdf'), payrollController.sendPayslip);

module.exports = router;

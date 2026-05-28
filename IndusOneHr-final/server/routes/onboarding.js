const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const onboardingController = require('../controllers/onboardingController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/onboarding';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `onboarding-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

router.use(auth);
router.use(auditLogger('Employee Onboarding'));

router.get('/templates', authorize(['hr', 'admin']), onboardingController.getTemplates);
router.post('/templates', authorize(['hr']), onboardingController.createTemplate);
router.post('/assign', authorize(['hr']), onboardingController.assignTemplate);
router.get('/cases', authorize(['hr', 'admin']), onboardingController.getAllCases);
router.get('/cases/active', authorize(['hr']), onboardingController.getActiveCases);
router.patch('/tasks/:id/hr', authorize(['hr']), onboardingController.hrUpdateTask);

router.get('/my-checklist', authorize(['employee']), onboardingController.getMyChecklist);
router.get('/my-summary', authorize(['employee']), onboardingController.getMySummary);
router.patch('/my/tasks/:id', authorize(['employee']), upload.single('document'), onboardingController.employeeUpdateTask);

module.exports = router;

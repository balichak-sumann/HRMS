const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const employeeController = require('../controllers/employeeController');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/avatars';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

router.use(auditLogger('Employees'));

router.get('/dashboard-stats', auth, employeeController.getDashboardStats);
router.get('/', auth, employeeController.getEmployees);
router.get('/hr-accounts', auth, authorize(['admin']), employeeController.getHrAccounts);
router.get('/:id', auth, employeeController.getEmployeeById);
router.post('/', auth, authorize(['hr', 'admin']), upload.single('avatar'), employeeController.createEmployee);
router.patch('/:id', auth, authorize(['hr', 'admin']), upload.single('avatar'), employeeController.updateEmployee);
router.patch('/:id/reactivate', auth, authorize(['hr', 'admin']), employeeController.reactivateEmployee);
router.delete('/:id', auth, authorize(['hr', 'admin']), employeeController.deleteEmployee);

module.exports = router;

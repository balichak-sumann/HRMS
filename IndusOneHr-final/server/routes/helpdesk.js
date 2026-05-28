const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const helpdeskController = require('../controllers/helpdeskController');

router.use(auditLogger('Helpdesk'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/helpdesk');
        require('fs').mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// ─── Employee Routes ────────────────────────────────────────────
router.post('/', auth, authorize(['employee']), helpdeskController.createTicket);
router.get('/my/tickets', auth, authorize(['employee']), helpdeskController.getMyTickets);
router.get('/my/assigned', auth, authorize(['employee']), helpdeskController.getAssignedTickets);

// ─── HR Routes ──────────────────────────────────────────────────
router.get('/hr/all', auth, authorize(['hr', 'admin']), helpdeskController.getAllTickets);
router.get('/hr/dashboard', auth, authorize(['hr', 'admin']), helpdeskController.getDashboardStats);
router.get('/hr/team-members', auth, authorize(['hr', 'admin']), helpdeskController.getTeamMembers);
router.patch('/:ticketId/assign', auth, authorize(['hr', 'admin']), helpdeskController.updateAssignment);
router.patch('/:ticketId/status', auth, authorize(['hr', 'admin']), helpdeskController.updateStatus);

router.get('/attachments/:attachmentId/download', auth, helpdeskController.downloadAttachment);
router.post('/:ticketId/comments', auth, helpdeskController.addComment);
router.post('/:ticketId/attachments', auth, upload.single('file'), helpdeskController.uploadAttachment);
router.get('/:ticketId', auth, helpdeskController.getTicketDetails);

module.exports = router;

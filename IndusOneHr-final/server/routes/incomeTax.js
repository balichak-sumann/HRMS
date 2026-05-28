const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const incomeTaxController = require('../controllers/incomeTaxController');

const router = express.Router();

const proofsDir = path.join(__dirname, '..', 'uploads', 'tax-declarations');
if (!fs.existsSync(proofsDir)) {
    fs.mkdirSync(proofsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, proofsDir),
    filename: (_, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        cb(null, `tax-proof-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
});

router.use(auth);
router.use(auditLogger('Income Tax Declaration'));

router.get('/my', authorize(['employee']), incomeTaxController.getMyDeclaration);
router.get('/my/list', authorize(['employee']), incomeTaxController.getMyDeclarationsList);
router.post('/my/versions', authorize(['employee']), incomeTaxController.createMyDeclarationVersion);
router.put('/my', authorize(['employee']), incomeTaxController.saveMyDeclaration);
router.post('/my/submit', authorize(['employee']), incomeTaxController.submitMyDeclaration);
router.post('/my/items/:itemId/proofs', authorize(['employee']), upload.single('proof'), incomeTaxController.uploadProof);
router.get('/my/form16', authorize(['employee']), incomeTaxController.getMyForm16Summary);

router.get('/hr/declarations', authorize(['hr']), incomeTaxController.getDeclarationsForHR);
router.get('/hr/declarations/:id', authorize(['hr']), incomeTaxController.getDeclarationDetailsForHR);
router.patch('/hr/items/:itemId/review', authorize(['hr']), incomeTaxController.reviewDeclarationItem);
router.get('/hr/form16/:employeeId', authorize(['hr']), incomeTaxController.getForm16SummaryForHR);

module.exports = router;

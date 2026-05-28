const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, authorize } = require('../middleware/auth');
const {
    submitExpenseClaim,
    getMyExpenseClaims,
    getReviewableClaims,
    reviewExpenseClaim,
    getMonthlyReimbursementSummary,
} = require('../controllers/expenseController');

const router = express.Router();

const expensesDir = path.join(__dirname, '..', 'uploads', 'expenses');
if (!fs.existsSync(expensesDir)) {
    fs.mkdirSync(expensesDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, expensesDir),
    filename: (_, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        cb(null, `receipt-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error('Only JPG, PNG, WEBP, and PDF files are allowed'));
        }
        cb(null, true);
    },
});

router.use(auth);

router.get('/mine', authorize(['employee']), getMyExpenseClaims);
router.post('/submit', authorize(['employee']), upload.single('receipt'), submitExpenseClaim);

router.get('/review', authorize(['hr', 'employee']), getReviewableClaims);
router.patch('/review/:id', authorize(['hr', 'employee']), reviewExpenseClaim);

router.get('/summary/monthly', authorize(['hr']), getMonthlyReimbursementSummary);

module.exports = router;

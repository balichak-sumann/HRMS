const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, authorize } = require('../middleware/auth');
const offerLetterController = require('../controllers/offerLetterController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', auth, authorize(['hr']), upload.single('offer_letter_pdf'), offerLetterController.createOfferLetter);
router.get('/', auth, authorize(['hr']), offerLetterController.getOfferLetters);
router.post('/:id/send', auth, authorize(['hr']), offerLetterController.sendOfferLetter);
router.post('/bulk-send', auth, authorize(['hr']), offerLetterController.bulkSendOfferLetters);
router.patch('/:id/status', auth, authorize(['hr']), offerLetterController.updateOfferLetterStatus);

module.exports = router;

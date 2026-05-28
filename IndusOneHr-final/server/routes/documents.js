const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const documentController = require('../controllers/documentController');

router.get('/', auth, documentController.getDocuments);
router.post('/', auth, authorize(['hr']), documentController.createDocument);

module.exports = router;

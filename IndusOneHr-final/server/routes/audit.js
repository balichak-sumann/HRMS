const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const auditController = require('../controllers/auditController');

router.get('/', auth, authorize(['admin']), auditController.getAuditLogs);

module.exports = router;

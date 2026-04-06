const express = require('express');
const router = express.Router();
const { getLookups } = require('../controllers/lookupController');

// GET /api/lookups OR /api/lookups?category=...
router.get('/', getLookups);

module.exports = router;

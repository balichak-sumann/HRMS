const express = require('express');
const router = express.Router();

const { auth, authorize } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const assetController = require('../controllers/assetController');

router.use(auth);
router.use(auditLogger('Asset Management'));

router.get('/my', authorize(['employee']), assetController.getMyAssets);

router.get('/', authorize(['hr']), assetController.listAssets);
router.post('/', authorize(['hr']), assetController.createAsset);
router.post('/:id/assign', authorize(['hr']), assetController.assignAsset);
router.post('/:id/return', authorize(['hr']), assetController.returnAsset);

module.exports = router;
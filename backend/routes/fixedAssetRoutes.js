const express = require('express');
const router = express.Router();
const fixedAssetController = require('../controllers/fixedAssetController');
const { protect, authorize } = require('../middleware/auth'); 

router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

router.get('/', fixedAssetController.getAssets);
router.post('/', fixedAssetController.registerAsset);
router.post('/depreciate', fixedAssetController.runMonthlyDepreciation);

module.exports = router;
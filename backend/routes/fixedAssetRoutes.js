const express = require('express');
const router = express.Router();
const fixedAssetController = require('../controllers/fixedAssetController');
const { protect } = require('../middleware/auth');
const licenseShield = require('../middleware/licenseShield');

router.use(protect);
router.use(licenseShield);

router.post('/', fixedAssetController.registerAsset);
router.get('/', fixedAssetController.getAssets);
router.post('/depreciate', fixedAssetController.runDepreciation);

module.exports = router;
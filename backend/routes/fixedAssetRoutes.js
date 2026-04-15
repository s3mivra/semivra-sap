const express = require('express');
const router = express.Router();
const Joi = require('joi');
const fixedAssetController = require('../controllers/fixedAssetController');
const { protect, authorize } = require('../middleware/auth');
const licenseShield = require('../middleware/licenseShield');
const { validateBody } = require('../middleware/validate'); // 🛡️ Import the shield

// 🛡️ Strict Schema to prevent invalid asset creation
const registerSchema = Joi.object({
    assetCode: Joi.string().required(),
    assetName: Joi.string().required(),
    description: Joi.string().allow('', null).optional(),
    serialNumber: Joi.string().allow('', null).optional(),
    purchaseDate: Joi.date().iso().required(),
    purchaseCost: Joi.number().min(0).required(),
    salvageValue: Joi.number().min(0).default(0),
    usefulLifeMonths: Joi.number().integer().min(1).required(),
    assetAccount: Joi.string().hex().length(24).optional(),
    expenseAccount: Joi.string().hex().length(24).optional(),
    accumulatedDepreciationAccount: Joi.string().hex().length(24).optional()
});

// 🛡️ Schema for running the depreciation batch
const runDepreciationSchema = Joi.object({
    period: Joi.string().pattern(/^\d{4}-\d{2}$/).required() // Must be YYYY-MM
});

// All routes protected by auth and license
router.use(protect);
router.use(licenseShield);

// Apply the validation shield to the endpoints
router.post('/', authorize('Super Admin', 'Accountant', 'Admin'), validateBody(registerSchema), fixedAssetController.registerAsset);
router.get('/', authorize('Super Admin', 'Accountant', 'Admin', 'User'), fixedAssetController.getAssets);
router.post('/depreciate', authorize('Super Admin', 'Accountant'), validateBody(runDepreciationSchema), fixedAssetController.runDepreciation);

module.exports = router;
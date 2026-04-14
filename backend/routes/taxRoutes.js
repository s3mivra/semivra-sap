const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const { protect, authorize } = require('../middleware/auth'); 
const licenseShield = require('../middleware/licenseShield'); 

router.use(protect);
router.use(licenseShield);
router.use(authorize('Admin', 'Super Admin'));

router.get('/summary', taxController.getTaxSummary);

module.exports = router;
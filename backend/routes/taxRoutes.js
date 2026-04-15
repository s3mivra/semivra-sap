const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const { protect } = require('../middleware/auth');
const licenseShield = require('../middleware/licenseShield');

router.use(protect);
router.use(licenseShield);

// Your Reporting Route
router.get('/summary', taxController.getTaxSummary);

// My Configuration Routes
router.get('/', taxController.getTaxes);
router.post('/', taxController.createTax);
router.put('/:id/toggle', taxController.toggleTaxStatus);

module.exports = router;
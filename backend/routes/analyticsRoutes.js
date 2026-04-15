const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const licenseShield = require('../middleware/licenseShield');

router.use(protect);
router.use(licenseShield);

router.get('/metrics', getDashboardMetrics);

module.exports = router;
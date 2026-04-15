const express = require('express');
const router = express.Router();
const { getDashboardMetrics, getSalesReport } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const licenseShield = require('../middleware/licenseShield');

router.use(protect);
router.use(licenseShield);

router.get('/metrics', getDashboardMetrics);
router.get('/sales-report', getSalesReport); // 🛡️ Added the missing route for SalesDashboard!

module.exports = router;
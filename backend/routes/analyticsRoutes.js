const express = require('express');
const { getDashboardMetrics } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

router.get('/metrics', getDashboardMetrics);

module.exports = router;
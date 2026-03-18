const express = require('express');
const { getFinancialSummary } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

router.get('/financials', getFinancialSummary);

module.exports = router;
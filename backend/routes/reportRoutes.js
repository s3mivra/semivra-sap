const express = require('express');
const { getFinancialSummary, getTrialBalance, getIncomeStatement } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

router.get('/financials', getFinancialSummary);
router.get('/trial-balance', protect, authorize('View Reports'), getTrialBalance);
router.get('/pnl', protect, getIncomeStatement);

module.exports = router;
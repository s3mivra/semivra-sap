const express = require('express');
// 👇 FIX: Imported 'generateIncomeStatement' instead of 'getIncomeStatement'
const { generateBalanceSheet, getTrialBalance, generateIncomeStatement } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply middleware to all routes in this file
router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

router.get('/balance-sheet', generateBalanceSheet);
// 👇 FIX: Used 'generateIncomeStatement' here
router.get('/income-statement', generateIncomeStatement);
router.get('/trial-balance', getTrialBalance);

module.exports = router;
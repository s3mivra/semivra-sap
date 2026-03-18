const express = require('express');
const { processPurchase, getAllTransactions } = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

// User route: Execute a purchase workflow
router.post('/purchase', protect, auditLog('PROCESS_PURCHASE'), processPurchase);

// Admin route: View the financial ledger and reports
router.get('/', protect, authorize('Admin', 'Super Admin'), auditLog('VIEW_FINANCIALS'), getAllTransactions);

module.exports = router;
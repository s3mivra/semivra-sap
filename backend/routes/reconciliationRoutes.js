const express = require('express');
const router = express.Router();
const { getUnreconciledCash, reconcileTransactions } = require('../controllers/reconciliationController');
const { protect, authorize } = require('../middleware/auth');

// 🔒 Use your dedicated controller functions
// 🛡️ Added '/unreconciled' to match your frontend service call
router.get('/unreconciled', protect, authorize('Admin', 'Super Admin'), getUnreconciledCash);
router.post('/clear', protect, authorize('Admin', 'Super Admin'), reconcileTransactions);

module.exports = router;
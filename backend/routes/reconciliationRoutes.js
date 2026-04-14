const express = require('express');
const router = express.Router();
const reconciliationController = require('../controllers/reconciliationController');
const { protect, authorize } = require('../middleware/auth'); 

// Secure the routes so only Admins can reconcile the bank
router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

router.get('/unreconciled', reconciliationController.getUnreconciledCash);
router.post('/match', reconciliationController.reconcileTransactions);

module.exports = router;
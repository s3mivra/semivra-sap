const express = require('express');
const router = express.Router();
const reconciliationController = require('../controllers/reconciliationController');
const { protect } = require('../middleware/auth');
const licenseShield = require('../middleware/licenseShield');

router.use(protect);
router.use(licenseShield);

// 💡 CHANGE: Update this to 'unreconciled' to match your accountingService.jsx
router.get('/unreconciled', reconciliationController.getUnreconciledCash);
router.post('/clear', reconciliationController.reconcileTransactions);

module.exports = router;
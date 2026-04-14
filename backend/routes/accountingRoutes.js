const express = require('express');
const { 
    createAccount, 
    deleteAccount,
    getAccounts, 
    postJournalEntry, 
    getJournalEntries,
    getUnpaidBills,
    recordPayment,
    voidJournalEntry // 👈 Add this import
} = require('../controllers/accountingController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

// All accounting routes require high-level access
router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

// Chart of Accounts Routes
router.route('/accounts')
    .get(getAccounts)
    .post(auditLog('CREATE_CHART_OF_ACCOUNT'), createAccount);

// 👇 NEW DELETE ROUTE 👇
router.route('/accounts/:id')
    .delete(auditLog('DELETE_CHART_OF_ACCOUNT'), deleteAccount);
// 👆 ================= 👆

// Journal Entry Routes
router.route('/journals')
    .get(auditLog('VIEW_GENERAL_LEDGER'), getJournalEntries)
    .post(auditLog('POST_JOURNAL_ENTRY'), postJournalEntry);

// 🚨 The Legal "Undo" Route
router.route('/journals/:id/void')
    .post(auditLog('VOID_JOURNAL_ENTRY'), voidJournalEntry);

router.get('/ap/unpaid', getUnpaidBills);
router.post('/ap/pay', recordPayment);

module.exports = router;
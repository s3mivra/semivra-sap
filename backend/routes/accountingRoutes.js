const express = require('express');
const { 
    createAccount, 
    deleteAccount,
    getAccounts, 
    postJournalEntry, 
    getJournalEntries,
    getUnpaidBills,
    recordPayment,
    voidJournalEntry
} = require('../controllers/accountingController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

// 1. Verify they have a valid token
router.use(protect);

// 👇 THE FIX: Check for the exact permission we defined in the User Manager! 👇
router.use(authorize('Manage Ledger'));
// 👆 ========================================================================= 👆

// Chart of Accounts Routes
router.route('/accounts')
    .get(getAccounts)
    .post(auditLog('CREATE_CHART_OF_ACCOUNT'), createAccount);

router.route('/accounts/:id')
    .delete(auditLog('DELETE_CHART_OF_ACCOUNT'), deleteAccount);

// Journal Entry Routes
router.route('/journals')
    .get(auditLog('VIEW_GENERAL_LEDGER'), getJournalEntries)
    .post(auditLog('POST_JOURNAL_ENTRY'), postJournalEntry);

router.route('/journals/:id/void')
    .post(auditLog('VOID_JOURNAL_ENTRY'), voidJournalEntry);

router.get('/ap/unpaid', getUnpaidBills);
router.post('/ap/pay', recordPayment);

module.exports = router;
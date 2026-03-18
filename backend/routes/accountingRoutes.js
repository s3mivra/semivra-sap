const express = require('express');
const { 
    createAccount, 
    getAccounts, 
    postJournalEntry, 
    getJournalEntries 
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

// Journal Entry Routes
router.route('/journals')
    .get(auditLog('VIEW_GENERAL_LEDGER'), getJournalEntries)
    .post(auditLog('POST_JOURNAL_ENTRY'), postJournalEntry);

module.exports = router;
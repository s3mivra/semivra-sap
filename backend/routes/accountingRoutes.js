const express = require('express');
const { 
    createAccount, 
    deleteAccount,
    getAccounts, 
    postJournalEntry, 
    getJournalEntries,
    getUnpaidBills,
    recordPayment,
    seedEssentialAccounts,
    voidJournalEntry
} = require('../controllers/accountingController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

// 🛡️ IMPORT THE VALIDATION SHIELD
const { validateBody } = require('../middleware/validate');
const { journalEntrySchema, voidJournalSchema } = require('../validations/accountingSchemas');

const router = express.Router();

// 1. Verify they have a valid token
router.use(protect);

// 2. Check for the exact permission defined in the User Manager
router.use(authorize('Manage Ledger'));

// Chart of Accounts Routes
router.route('/accounts')
    .get(getAccounts)
    .post(auditLog('CREATE_CHART_OF_ACCOUNT'), createAccount);

router.route('/accounts/:id')
    .delete(auditLog('DELETE_CHART_OF_ACCOUNT'), deleteAccount);

// Journal Entry Routes
router.route('/journals')
    .get(auditLog('VIEW_GENERAL_LEDGER'), getJournalEntries)
    // 🛡️ INJECT SHIELD: Reject bad data BEFORE auditing or posting to the DB
    .post(validateBody(journalEntrySchema), auditLog('POST_JOURNAL_ENTRY'), postJournalEntry);

router.route('/journals/:id/void')
    // 🛡️ INJECT SHIELD: Secure the void endpoint
    .post(validateBody(voidJournalSchema), auditLog('VOID_JOURNAL_ENTRY'), voidJournalEntry);

// Accounts Payable Routes
router.get('/ap/unpaid', getUnpaidBills);
router.post('/ap/pay', authorize('Admin', 'Super Admin'), recordPayment);

router.post('/coa/seed', authorize('Admin', 'Super Admin'), seedEssentialAccounts);

module.exports = router;
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');

// ==========================================
// CHART OF ACCOUNTS (CoA) MANAGEMENT
// ==========================================

exports.createAccount = async (req, res) => {
    try {
        const account = await Account.create(req.body);
        res.status(201).json({ success: true, data: account });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Account code already exists.' });
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAccounts = async (req, res) => {
    try {
        // Sort by code so they appear in standard accounting order (Assets -> Liabilities -> Equity -> Revenue -> Expense)
        const accounts = await Account.find({ isActive: true }).sort({ code: 1 });
        res.status(200).json({ success: true, count: accounts.length, data: accounts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==========================================
// JOURNAL ENTRIES (THE GENERAL LEDGER)
// ==========================================

exports.postJournalEntry = async (req, res) => {
    try {
        const { date, description, sourceDocument, lines } = req.body;

        // Generate a unique entry number (In production, use a robust sequence generator)
        const entryCount = await JournalEntry.countDocuments();
        const entryNumber = `JRN-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}`;

        const journalEntry = await JournalEntry.create({
            entryNumber,
            date: date || Date.now(),
            description,
            sourceDocument,
            lines,
            postedBy: req.user.id // Captured from JWT auth middleware
        });

        res.status(201).json({ success: true, message: 'Journal Entry posted successfully', data: journalEntry });
    } catch (error) {
        // The pre-save hook in the model will catch unbalanced entries and throw an error here
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getJournalEntries = async (req, res) => {
    try {
        const entries = await JournalEntry.find()
            .populate('postedBy', 'name email')
            .populate('lines.account', 'code name type')
            .sort({ date: -1, createdAt: -1 });
            
        res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
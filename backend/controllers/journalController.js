const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

// 1. Create a New Journal Entry
exports.createJournalEntry = async (req, res) => {
    try {
        const { documentDate, description, sourceDocument, lines } = req.body;

        if (!lines || lines.length < 2) {
            return res.status(400).json({ success: false, message: "A journal entry requires at least two lines." });
        }

        // 📅 1. Auto-Generate the Period (YYYY-MM)
        const dDate = new Date(documentDate);
        const period = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;

        // 🔢 2. Auto-Generate Entry Number
        const count = await JournalEntry.countDocuments({ period });
        const entryNumber = `JRN-${period}-${String(count + 1).padStart(4, '0')}`;

        // 💾 3. Save it (Your Schema's pre-validate hook will automatically check Debits = Credits!)
        const newEntry = await JournalEntry.create({
            entryNumber,
            documentDate,
            period,
            description,
            sourceDocument,
            lines,
            postedBy: req.user._id // Ensure your auth middleware attaches req.user
        });

        // ⚖️ 4. Update the Chart of Accounts running balances
        for (let line of lines) {
            const account = await Account.findById(line.account);
            if (account) {
                // Asset & Expense increase with Debits. Liability, Equity, & Revenue increase with Credits.
                if (['Asset', 'Expense'].includes(account.accountType)) {
                    account.currentBalance += (Number(line.debit) || 0) - (Number(line.credit) || 0);
                } else {
                    account.currentBalance += (Number(line.credit) || 0) - (Number(line.debit) || 0);
                }
                await account.save();
            }
        }

        res.status(201).json({ success: true, data: newEntry });
    } catch (error) {
        // This will catch the error if your schema says "Debits don't equal Credits!"
        res.status(400).json({ success: false, message: error.message });
    }
};

// 2. Fetch Journal Entries
exports.getJournalEntries = async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;
        let filter = {};

        if (period) filter.period = period;
        if (startDate && endDate) {
            filter.documentDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const entries = await JournalEntry.find(filter)
            .populate('lines.account', 'accountCode accountName accountType')
            .populate('postedBy', 'name email')
            .sort({ documentDate: -1, createdAt: -1 });

        res.status(200).json({ success: true, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Void a Journal Entry (The Legal "Undo" Button)
exports.voidJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { voidReason } = req.body;

        if (!voidReason) {
            return res.status(400).json({ success: false, message: "A reason is required to void a journal entry." });
        }

        const entry = await JournalEntry.findById(id);

        if (!entry) {
            return res.status(404).json({ success: false, message: "Journal entry not found." });
        }

        if (entry.status === 'Voided') {
            return res.status(400).json({ success: false, message: "This entry is already voided." });
        }

        // ⚖️ REVERSE THE LEDGER POSTING: Undo the math in the Chart of Accounts
        for (let line of entry.lines) {
            const account = await Account.findById(line.account); // or line.accountId based on your exact schema
            if (account) {
                // We do the exact opposite of the create function
                if (['Asset', 'Expense'].includes(account.accountType)) {
                    account.currentBalance -= (Number(line.debit) || 0) - (Number(line.credit) || 0);
                } else {
                    account.currentBalance -= (Number(line.credit) || 0) - (Number(line.debit) || 0);
                }
                await account.save();
            }
        }

        // Mark the entry as voided with the audit trail
        entry.status = 'Voided';
        entry.voidReason = voidReason;
        entry.voidedAt = Date.now();
        entry.voidedBy = req.user._id; // Assuming auth middleware
        
        await entry.save();

        res.status(200).json({ success: true, message: "Journal Entry successfully voided.", data: entry });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

// Fetch all unverified cash transactions
exports.getUnreconciledCash = async (req, res) => {
    try {
        const cashAccounts = await Account.find({ 
            accountName: { $regex: /Cash|Bank|BDO|BPI|Metrobank/i } 
        });
        const cashAccountIds = cashAccounts.map(a => a._id);

        if (cashAccountIds.length === 0) {
            return res.status(400).json({ success: false, message: "No Cash or Bank accounts found." });
        }

        const entries = await JournalEntry.find({
            "lines.account": { $in: cashAccountIds },
            "lines.isReconciled": false,
            status: "Posted" 
        }).populate('lines.account', 'accountName');

        const unreconciledLines = [];
        entries.forEach(entry => {
            entry.lines.forEach(line => {
                if (cashAccountIds.some(id => id.equals(line.account._id)) && !line.isReconciled) {
                    unreconciledLines.push({
                        journalId: entry._id,
                        lineId: line._id,
                        date: entry.documentDate,
                        entryNumber: entry.entryNumber,
                        description: entry.description,
                        accountName: line.account.accountName,
                        amount: line.debit > 0 ? line.debit : -line.credit, 
                        type: line.debit > 0 ? 'Deposit' : 'Withdrawal'
                    });
                }
            });
        });

        unreconciledLines.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({ success: true, count: unreconciledLines.length, data: unreconciledLines });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lock transactions as Reconciled
exports.reconcileTransactions = async (req, res) => {
    try {
        const { matchedLineIds } = req.body;

        if (!matchedLineIds || matchedLineIds.length === 0) {
            return res.status(400).json({ success: false, message: "No transactions selected for reconciliation." });
        }

        const result = await JournalEntry.updateMany(
            { "lines._id": { $in: matchedLineIds } },
            { 
                $set: { 
                    "lines.$[elem].isReconciled": true,
                    "lines.$[elem].reconciledAt": Date.now()
                } 
            },
            { arrayFilters: [{ "elem._id": { $in: matchedLineIds } }] }
        );

        res.status(200).json({ 
            success: true, 
            message: `Successfully reconciled ${matchedLineIds.length} transaction(s).`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
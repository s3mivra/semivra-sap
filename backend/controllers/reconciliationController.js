const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const mongoose = require('mongoose');

// 🛡️ Helper to extract tenant ID
const getDivision = (req) => {
    if (req.user?.role?.level === 100) return req.headers['x-division-id'] || req.body.division;
    return req.user?.division;
};

// ✅ BACKEND SYNTAX: exports.functionName
// Fetch all unverified cash transactions (SECURED & CRASH-PROOF)
exports.getUnreconciledCash = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        if (!targetDivision) return res.status(400).json({ success: false, message: 'Division context missing.' });
        const divIdString = targetDivision._id ? targetDivision._id.toString() : targetDivision.toString();

        // 1. Fetch Cash Accounts
        const cashAccounts = await Account.find({ 
            division: divIdString,
            $or: [
                { accountName: { $regex: /Cash|Bank|BDO|BPI|Metrobank/i } },
                { name: { $regex: /Cash|Bank|BDO|BPI|Metrobank/i } }
            ]
        });
        
        const cashAccountIds = cashAccounts.map(a => a._id);
        const totalBookBalance = cashAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

        if (cashAccountIds.length === 0) {
            return res.status(200).json({ success: true, bookBalance: 0, unclearedTransactions: [], message: "No Cash/Bank accounts found." });
        }

        // 2. Fetch Entries
        const entries = await JournalEntry.find({
            division: divIdString,
            "lines.account": { $in: cashAccountIds },
            "lines.isReconciled": { $ne: true }, 
            status: "Posted" 
        }).populate('lines.account', 'accountName name code');

        const unclearedLines = [];
        
        // 3. The Safe Formatting Loop
        entries.forEach(entry => {
            entry.lines.forEach(line => {
                
                // 🛡️ CRITICAL FIX: If the account was deleted from the DB, skip it so the server doesn't crash!
                if (!line.account || !line.account._id) return;

                // Safely compare IDs using strings to prevent Mongoose object mismatches
                if (cashAccountIds.some(id => id.toString() === line.account._id.toString()) && !line.isReconciled) {
                    unclearedLines.push({
                        _id: line._id, 
                        journalId: entry._id,
                        date: entry.documentDate || entry.date,
                        entryNumber: entry.entryNumber,
                        description: entry.description,
                        accountName: `${line.account.code || ''} ${line.account.name || line.account.accountName || ''}`.trim(),
                        amount: line.debit > 0 ? line.debit : line.credit, 
                        type: line.debit > 0 ? 'Deposit' : 'Withdrawal'
                    });
                }
            });
        });

        unclearedLines.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({ 
            success: true, 
            bookBalance: totalBookBalance, 
            unclearedTransactions: unclearedLines 
        });
    } catch (error) {
        console.error("Reconciliation Fetch Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ BACKEND SYNTAX: exports.functionName
exports.reconcileTransactions = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const { clearedEntryIds, statementDate, statementBalance } = req.body; 
            const targetDivision = getDivision(req);

            if (!targetDivision) throw new Error('Division context missing.');
            const divIdString = targetDivision._id ? targetDivision._id.toString() : targetDivision.toString();

            if (!clearedEntryIds || !Array.isArray(clearedEntryIds) || clearedEntryIds.length === 0) {
                throw new Error("No transactions selected for reconciliation.");
            }

            const result = await JournalEntry.updateMany(
                { 
                    division: divIdString,
                    "lines._id": { $in: clearedEntryIds } 
                },
                { 
                    $set: { 
                        "lines.$[elem].isReconciled": true,
                        "lines.$[elem].reconciledAt": statementDate ? new Date(statementDate) : new Date()
                    } 
                },
                { 
                    arrayFilters: [{ "elem._id": { $in: clearedEntryIds } }],
                    session 
                }
            );

            if (result.modifiedCount === 0) {
                throw new Error("Failed to update records. Line IDs may be invalid or already reconciled.");
            }
        });

        res.status(200).json({ success: true, message: "Transactions successfully reconciled and locked." });
    } catch (error) {
        console.error("Bulk Reconciliation Error:", error);
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};
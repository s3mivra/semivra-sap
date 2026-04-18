const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const mongoose = require('mongoose');

// 🛡️ Helper to extract tenant ID
const { getDivision } = require('../utils/divisionHelper');

// ✅ BACKEND SYNTAX: exports.functionName
// Fetch all unverified cash transactions (SECURED & CRASH-PROOF)
exports.getUnreconciledCash = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        if (!targetDivision) return res.status(400).json({ success: false, message: 'Division context missing.' });
        const divIdString = targetDivision._id ? targetDivision._id.toString() : targetDivision.toString();

        // 1. Fetch Cash Accounts
        // 1. Fetch REAL Bank Accounts (Exclude Cash on Hand)
        const cashAccounts = await Account.find({ 
            division: divIdString,
            $or: [
                // 🛡️ THE FIX: Removed 'Cash' so we don't grab the physical POS drawer!
                { accountName: { $regex: /Bank|BDO|BPI|Metrobank/i } },
                { name: { $regex: /Bank|BDO|BPI|Metrobank/i } }
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

// ✅ THE X-RAY DIAGNOSTIC CONTROLLER
// ✅ THE BULLETPROOF "X-RAY" CONTROLLER
exports.reconcileTransactions = async (req, res) => {
    console.log("\n=============================================");
    console.log("🚨 [DEBUG] 1. RECONCILIATION ROUTE HIT!");
    console.log("🚨 INCOMING PAYLOAD:", req.body);
    console.log("=============================================\n");

    try {
        const { clearedEntryIds, statementDate } = req.body; 
        const targetDivision = getDivision(req);

        console.log("🚨 2. TARGET DIVISION:", targetDivision);

        if (!clearedEntryIds || !Array.isArray(clearedEntryIds) || clearedEntryIds.length === 0) {
            return res.status(400).json({ success: false, message: "No transactions selected for reconciliation." });
        }

        let updatedCount = 0;

        console.log(`🚨 3. SEARCHING DATABASE FOR THESE LINE IDs:`, clearedEntryIds);

        // Fetch the exact Journal Entries that contain the lines we want to clear
        const entries = await JournalEntry.find({
            division: targetDivision,
            "lines._id": { $in: clearedEntryIds } 
        });

        console.log(`🚨 4. MONGODB FOUND [ ${entries.length} ] JOURNAL ENTRIES.`);

        if (entries.length === 0) {
            throw new Error("Database found 0 entries. Check if the Division is correct or if the data actually exists.");
        }

        // Modify the lines manually using pure JavaScript
        for (let entry of entries) {
            let documentChanged = false;
            console.log(`\n➡️ OPENING ENTRY: ${entry.entryNumber} (ID: ${entry._id})`);

            for (let line of entry.lines) {
                const lineIdString = line._id.toString();
                
                // Compare what the database has against what React sent
                if (clearedEntryIds.includes(lineIdString)) {
                    console.log(`   ✅ MATCH FOUND: Line ID [ ${lineIdString} ]`);
                    console.log(`      🔄 Before: isReconciled = ${line.isReconciled}`);
                    
                    // The actual update
                    line.isReconciled = true;
                    line.reconciledAt = statementDate ? new Date(statementDate) : new Date();
                    
                    console.log(`      🔄 After: isReconciled = ${line.isReconciled}`);
                    documentChanged = true;
                    updatedCount++;
                } else {
                    console.log(`   ❌ Skipped: Line ID [ ${lineIdString} ] (Not selected by user)`);
                }
            }

            // Save the document back to the database
            if (documentChanged) {
                console.log(`   💾 Attempting to save Entry ${entry.entryNumber}...`);
                await entry.save(); 
                console.log(`   ✅ Entry ${entry.entryNumber} saved successfully!`);
            }
        }

        console.log(`\n🚨 5. FINAL TALLY: [ ${updatedCount} ] LINES UPDATED SUCCESSFULLY.`);

        if (updatedCount === 0) {
            throw new Error("Found the entries, but 0 lines were updated. Are they already set to true?");
        }

        res.status(200).json({ 
            success: true, 
            message: `Successfully locked ${updatedCount} transactions!` 
        });

    } catch (error) {
        console.error("\n🔥 FATAL RECONCILIATION ERROR 🔥");
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};
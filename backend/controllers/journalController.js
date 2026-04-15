const mongoose = require('mongoose');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

exports.createJournalEntry = async (req, res) => {
    // 1. Initialize the ACID Session
    const session = await mongoose.startSession();
    
    try {
        // 2. Wrap everything in a strict transaction
        await session.withTransaction(async () => {
            const { lines, description, documentDate, sourceDocument } = req.body;
            const division = req.headers['x-division-id']; // Ensure this is extracted via your getDivision helper

            if (!division) throw new Error("Tenant Division ID is missing.");

            // Step A: Create the Journal Entry record
            const entry = new JournalEntry({
                entryNumber: `JE-${Date.now()}`, // Or your generateEntryNumber helper
                date: documentDate || new Date(),
                postingDate: new Date(),
                description,
                sourceDocument,
                division,
                lines,
                status: 'Posted',
                postedBy: req.user._id
            });
            
            // Pre-save hooks will validate Debits === Credits here
            await entry.save({ session });
            
            // Step B: Atomically update the Chart of Accounts balances
            for (const line of lines) {
                // Adjust math based on Normal Balance (Asset/Expense = DR, Liab/Eq/Rev = CR)
                // Assuming currentBalance is purely additive for simplicity, adjust to your exact schema
                const netChange = (line.debit || 0) - (line.credit || 0); 
                
                await Account.findByIdAndUpdate(
                    line.account,
                    { $inc: { currentBalance: netChange } },
                    { session, new: true }
                );
            }
        });

        // 3. If we reach here, the transaction was completely successful
        res.status(201).json({ message: "Journal entry posted successfully and balances updated." });
    } catch (error) {
        // Transaction automatically aborted by withTransaction on error
        res.status(400).json({ error: error.message || "Failed to post transaction." });
    } finally {
        session.endSession();
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
// INSIDE backend/controllers/journalController.js

exports.voidJournalEntry = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        await session.withTransaction(async () => {
            const { id } = req.params;
            const { voidReason } = req.body;

            if (!voidReason) {
                throw new Error("A reason is required to void a journal entry.");
            }

            const entry = await JournalEntry.findById(id).session(session);

            if (!entry) {
                throw new Error("Journal entry not found.");
            }

            if (entry.status === 'Voided') {
                throw new Error("This entry is already voided.");
            }

            for (let line of entry.lines) {
                const account = await Account.findById(line.account).session(session);
                if (account) {
                    if (['Asset', 'Expense'].includes(account.accountType)) {
                        account.currentBalance -= (Number(line.debit) || 0) - (Number(line.credit) || 0);
                    } else {
                        account.currentBalance -= (Number(line.credit) || 0) - (Number(line.debit) || 0);
                    }
                    await account.save({ session });
                }
            }

            entry.status = 'Voided';
            entry.voidReason = voidReason;
            entry.voidedAt = Date.now();
            entry.voidedBy = req.user._id;
            
            await entry.save({ session });
        });

        // We re-fetch the entry outside the transaction just to return the clean data if needed
        const updatedEntry = await JournalEntry.findById(req.params.id);
        res.status(200).json({ success: true, message: "Journal Entry successfully voided.", data: updatedEntry });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

exports.createAccrual = async (req, res) => {
  const targetDivision = req.headers['x-division-id'];
  const { period, documentDate, postingDate, lines, description, entryNumber } = req.body;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      
      // 1. Post Original Accrual
      const accrualJE = new JournalEntry({
        division: targetDivision, period, entryNumber, documentDate, postingDate, description,
        lines, totalDebit, totalCredit: totalDebit
      });
      await accrualJE.save({ session });

      // 2. Post Reversal for 1st day of NEXT period
      const currentPeriodDate = new Date(`${period}-01`);
      currentPeriodDate.setMonth(currentPeriodDate.getMonth() + 1);
      const nextPeriodString = currentPeriodDate.toISOString().substring(0, 7);
      
      // Flip DR/CR
      const reversingLines = lines.map(line => ({
        account: line.account,
        debit: line.credit || 0, 
        credit: line.debit || 0
      }));

      const reversingJE = new JournalEntry({
        division: targetDivision,
        period: nextPeriodString,
        entryNumber: `REV-${entryNumber}`,
        documentDate: new Date(),
        postingDate: currentPeriodDate, // 1st day of next month
        description: `Auto-Reversal of Accrual ${entryNumber}`,
        lines: reversingLines,
        totalDebit, totalCredit: totalDebit
      });

      await reversingJE.save({ session });
    });
    res.json({ message: 'Accrual and Reversal successfully generated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};
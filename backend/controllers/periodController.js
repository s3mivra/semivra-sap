const mongoose = require('mongoose');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const FinancialPeriod = require('../models/FinancialPeriod');

// Helper for division extraction
const { getDivision } = require('../utils/divisionHelper');
// Get all periods for the division
exports.getPeriods = async (req, res) => {
    try {
        const periods = await FinancialPeriod.find({ division: getDivision(req) }).sort({ periodCode: -1 });
        res.status(200).json({ success: true, data: periods });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle a Period (Open -> Closed, or Closed -> Open)
exports.togglePeriod = async (req, res) => {
    try {
        const { periodCode, status } = req.body;
        const targetDivision = getDivision(req);

        let period = await FinancialPeriod.findOne({ division: targetDivision, periodCode });

        // If the period doesn't exist yet, create it
        if (!period) {
            period = new FinancialPeriod({ division: targetDivision, periodCode });
        }

        period.status = status;
        
        if (status === 'Closed') {
            period.closedBy = req.user.id || req.user._id;
            period.closedAt = Date.now();
        } else {
            period.closedBy = undefined;
            period.closedAt = undefined;
        }

        await period.save();
        res.status(200).json({ success: true, message: `Period ${periodCode} is now ${status}`, data: period });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// --- THE MISSING HELPER ENGINE ---
const calculateNetIncomeForPeriod = async (targetDivision, period, session) => {
    const pipeline = [
        { $match: { division: new mongoose.Types.ObjectId(targetDivision), period } },
        { $unwind: "$lines" },
        { 
            $lookup: {
                from: 'accounts',
                localField: 'lines.account',
                foreignField: '_id',
                as: 'accountDetails'
            }
        },
        { $unwind: "$accountDetails" },
        { $match: { "accountDetails.type": { $in: ["Revenue", "COGS", "Expense"] } } },
        {
            $group: {
                _id: "$accountDetails.type", // Group by Revenue, COGS, or Expense
                totalDebit: { $sum: "$lines.debit" },
                totalCredit: { $sum: "$lines.credit" }
            }
        }
    ];

    // Execute aggregation WITH the ACID session lock
    const results = await JournalEntry.aggregate(pipeline).session(session);

    let revenue = 0;
    let cogs = 0;
    let expense = 0;

    // Calculate normal balances (Revenue is Normal Credit; COGS/Expense are Normal Debit)
    results.forEach(group => {
        if (group._id === 'Revenue') {
            revenue = (group.totalCredit || 0) - (group.totalDebit || 0);
        } else if (group._id === 'COGS') {
            cogs = (group.totalDebit || 0) - (group.totalCredit || 0);
        } else if (group._id === 'Expense') {
            expense = (group.totalDebit || 0) - (group.totalCredit || 0);
        }
    });

    return revenue - cogs - expense;
};

// --- THE MAIN CONTROLLER ---
exports.closePeriod = async (req, res) => {
    const targetDivision = req.headers['x-division-id'];
    const { period } = req.body; // e.g., '2026-04'

    if (!targetDivision || !period) {
        return res.status(400).json({ error: 'Division ID and Period are required.' });
    }

    const session = await mongoose.startSession();
  
    try {
        await session.withTransaction(async () => {
            // 1. Lock Period
            const periodRecord = await FinancialPeriod.findOneAndUpdate(
                { division: targetDivision, period },
                { isClosed: true },
                { new: true, session }
            );

            if (!periodRecord) {
                throw new Error(`Financial Period ${period} does not exist in the system.`);
            }

            // 2. Fetch P&L Summary strictly locked to this transaction
            const netIncome = await calculateNetIncomeForPeriod(targetDivision, period, session);

            // 3. Roll Forward into Retained Earnings
            if (netIncome !== 0) {
                // Ensure these system accounts exist in your DB seeded data
                const retainedEarningsAcc = await Account.findOne({ division: targetDivision, systemCode: 'RETAINED_EARNINGS' }).session(session);
                const pnlSummaryAcc = await Account.findOne({ division: targetDivision, systemCode: 'PNL_SUMMARY' }).session(session);
                
                if (!retainedEarningsAcc || !pnlSummaryAcc) {
                    throw new Error("Critical System Accounts (RETAINED_EARNINGS or PNL_SUMMARY) are missing.");
                }

                // Determine next period string (e.g. 2026-04 -> 2026-05)
                const nextPeriodDate = new Date(`${period}-01`);
                nextPeriodDate.setMonth(nextPeriodDate.getMonth() + 1);
                const nextPeriodString = nextPeriodDate.toISOString().substring(0, 7);

                // Create the closing entry
                const closingJe = new JournalEntry({
                    division: targetDivision,
                    period: nextPeriodString, 
                    entryNumber: `CL-${period}`,
                    documentDate: new Date(),
                    postingDate: nextPeriodDate,
                    description: `Month-End Close: Rolling Net Income for ${period}`,
                    lines: [
                        { 
                            account: pnlSummaryAcc._id, 
                            debit: netIncome > 0 ? netIncome : 0, 
                            credit: netIncome < 0 ? Math.abs(netIncome) : 0 
                        },
                        { 
                            account: retainedEarningsAcc._id, 
                            debit: netIncome < 0 ? Math.abs(netIncome) : 0, 
                            credit: netIncome > 0 ? netIncome : 0 
                        }
                    ],
                    totalDebit: Math.abs(netIncome),
                    totalCredit: Math.abs(netIncome)
                });

                // Pre-validate hook triggers here to ensure debits === credits
                await closingJe.save({ session });
            }
        });

        res.json({ message: `Period ${period} successfully closed. Net Income rolled forward.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        session.endSession();
    }
};
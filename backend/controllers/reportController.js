const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const mongoose = require('mongoose');

// 🛡️ Helper to extract tenant ID
const { getDivision } = require('../utils/divisionHelper');

// ==========================================
// 1. BALANCE SHEET (Snapshot of Accounts)
// ==========================================
exports.generateBalanceSheet = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        if (!targetDivision) return res.status(400).json({ error: 'Division ID required' });

        const accounts = await Account.find({ division: targetDivision }).lean();

        const report = {
            assets: { items: [], total: 0 },
            liabilities: { items: [], total: 0 },
            equity: { items: [], total: 0 }
        };

        accounts.forEach(acc => {
            const balance = acc.currentBalance || 0;
            if (balance === 0) return; // Skip empty accounts for a clean report

            const item = { code: acc.code || acc.accountCode, name: acc.name || acc.accountName, balance };
            const type = (acc.type || acc.accountType || '').toLowerCase();
            
            if (type.includes('asset')) {
                report.assets.items.push(item);
                report.assets.total += (acc.isContra ? -balance : balance);
            } else if (type.includes('liability') || type.includes('payable')) {
                report.liabilities.items.push(item);
                report.liabilities.total += balance; 
            } else if (type.includes('equity') || type.includes('capital')) {
                report.equity.items.push(item);
                report.equity.total += balance; 
            }
        });

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        console.error("Balance Sheet Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// ==========================================
// 2. INCOME STATEMENT (P&L over time)
// ==========================================
exports.generateIncomeStatement = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        const { startDate, endDate } = req.query;

        if (!targetDivision) return res.status(400).json({ error: 'Division ID required' });
        
        // Default to current month if no dates provided
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();

        const accounts = await Account.find({ division: targetDivision }).lean();
        const accountMap = {};
        accounts.forEach(acc => {
            accountMap[acc._id.toString()] = { 
                name: acc.name || acc.accountName, 
                type: (acc.type || acc.accountType || '').toLowerCase() 
            };
        });

        const entries = await JournalEntry.find({
            division: targetDivision,
            date: { $gte: start, $lte: end },
            status: 'Posted' 
        }).lean();

        const report = {
            revenue: { items: {}, total: 0 },
            cogs: { items: {}, total: 0 },
            expenses: { items: {}, total: 0 },
            netIncome: 0,
            grossProfit: 0
        };

        entries.forEach(entry => {
            entry.lines.forEach(line => {
                const accId = line.account.toString();
                const accountDef = accountMap[accId];
                if (!accountDef) return; 

                const type = accountDef.type;
                const netAmount = (line.credit || 0) - (line.debit || 0); // Credit is positive for Income

                if (type.includes('revenue') || type.includes('income') || type.includes('sales')) {
                    report.revenue.items[accountDef.name] = (report.revenue.items[accountDef.name] || 0) + netAmount;
                    report.revenue.total += netAmount;
                } else if (type.includes('cogs') || type.includes('cost of sales')) {
                    report.cogs.items[accountDef.name] = (report.cogs.items[accountDef.name] || 0) + (-netAmount);
                    report.cogs.total += (-netAmount);
                } else if (type.includes('expense')) {
                    report.expenses.items[accountDef.name] = (report.expenses.items[accountDef.name] || 0) + (-netAmount);
                    report.expenses.total += (-netAmount);
                }
            });
        });

        report.grossProfit = report.revenue.total - report.cogs.total;
        report.netIncome = report.grossProfit - report.expenses.total;

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        console.error("Income Statement Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// ==========================================
// 3. TRIAL BALANCE (Your Aggregation Masterpiece)
// ==========================================
exports.getTrialBalance = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        if (!targetDivision) return res.status(400).json({ success: false, message: 'Division context missing.' });

        const divisionId = new mongoose.Types.ObjectId(
            targetDivision._id ? targetDivision._id.toString() : targetDivision.toString()
        );

        const asOfDate = req.query.date ? new Date(req.query.date) : new Date();

        const trialBalance = await JournalEntry.aggregate([
            { $match: { division: divisionId, postingDate: { $lte: asOfDate }, status: 'Posted' } },
            { $unwind: "$lines" },
            {
                $group: {
                    _id: "$lines.account",
                    totalDebit: { $sum: "$lines.debit" },
                    totalCredit: { $sum: "$lines.credit" }
                }
            },
            {
                $lookup: {
                    from: "accounts", 
                    localField: "_id",
                    foreignField: "_id",
                    as: "accountDetails"
                }
            },
            { $unwind: "$accountDetails" },
            {
                $project: {
                    _id: 0,
                    accountId: "$_id",
                    accountCode: { $ifNull: ["$accountDetails.accountCode", "$accountDetails.code"] },
                    accountName: { $ifNull: ["$accountDetails.accountName", "$accountDetails.name"] },
                    type: { $ifNull: ["$accountDetails.accountType", "$accountDetails.type"] },
                    totalDebit: 1,
                    totalCredit: 1,
                    balance: {
                        $cond: {
                            if: { $in: [{ $ifNull: ["$accountDetails.accountType", "$accountDetails.type"] }, ["Asset", "Expense"]] },
                            then: { $subtract: ["$totalDebit", "$totalCredit"] },
                            else: { $subtract: ["$totalCredit", "$totalDebit"] }
                        }
                    }
                }
            },
            { $sort: { accountCode: 1 } }
        ]);

        let systemTotalDebit = 0;
        let systemTotalCredit = 0;

        trialBalance.forEach(row => {
            systemTotalDebit += row.totalDebit;
            systemTotalCredit += row.totalCredit;
        });

        systemTotalDebit = Math.round(systemTotalDebit * 100) / 100;
        systemTotalCredit = Math.round(systemTotalCredit * 100) / 100;

        res.status(200).json({
            success: true,
            data: {
                asOf: asOfDate,
                isBalanced: systemTotalDebit === systemTotalCredit,
                systemTotalDebit,
                systemTotalCredit,
                accounts: trialBalance
            }
        });

    } catch (error) {
        console.error("Trial Balance Error:", error);
        res.status(500).json({ success: false, message: "Failed to generate Trial Balance." });
    }
};
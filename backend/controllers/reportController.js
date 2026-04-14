const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const mongoose = require('mongoose');

// Helper for division extraction
const getDivision = (req) => {
    if (req.user.role === 'Super Admin' && req.query.division) {
        return req.query.division;
    }
    return req.user.division;
};

// ==========================================
// 1. FINANCIAL SUMMARY (Balance Sheet & P&L)
// ==========================================
exports.getFinancialSummary = async (req, res) => {
    try {
        const targetDivision = getDivision(req);

        // 🏢 SILO LOCK 1: Only fetch accounts for THIS division
        const accounts = await Account.find({ 
            division: targetDivision,
            $or: [{ isActive: true }, { isActive: { $exists: false } }] 
        }).lean();
        
        // 🏢 SILO LOCK 2: Only sum up journal entries for THIS division
        const balances = await JournalEntry.aggregate([
            { $match: { division: new mongoose.Types.ObjectId(targetDivision) } }, // 👈 THE FIX
            { $unwind: "$lines" },
            { $group: {
                _id: { $ifNull: ["$lines.account", "$lines.accountId"] },
                totalDebit: { $sum: "$lines.debit" },
                totalCredit: { $sum: "$lines.credit" }
            }}
        ]);

        // 🏢 THE GAAP/PFRS REPORTING STRUCTURE
        let report = {
            totalCurrentAssets: 0, totalNonCurrentAssets: 0, totalAssets: 0,
            totalCurrentLiabilities: 0, totalNonCurrentLiabilities: 0, totalLiabilities: 0,
            totalEquity: 0,
            totalRevenue: 0, totalCogs: 0, grossProfit: 0, 
            totalOpex: 0, operatingIncome: 0, totalTaxesAndInterest: 0, netIncome: 0,
            breakdown: { 
                currentAssets: [], nonCurrentAssets: [], 
                currentLiabilities: [], nonCurrentLiabilities: [], 
                equity: [], 
                revenue: [], cogs: [], opex: [], taxesAndInterest: [] 
            }
        };

        accounts.forEach(acc => {
            const accType = acc.accountType || acc.type;
            const accName = acc.accountName || acc.name || "";
            const accCode = acc.accountCode || acc.code || "----";
            const accGroup = (acc.accountGroup || "").toUpperCase(); 
            
            if (!accType || !accName) return;

            const bal = balances.find(b => String(b._id) === String(acc._id));
            const debit = bal ? bal.totalDebit : 0;
            const credit = bal ? bal.totalCredit : 0;
            
            let finalBalance = acc.openingBalance || 0;

            if (accType === 'Asset' || accType === 'Expense') {
                finalBalance += (debit - credit);
            } else { 
                finalBalance += (credit - debit);
            }

            if (finalBalance !== 0 || accName.includes('Cash') || accName.includes('Sales')) {
                const accData = { name: accName, code: accCode, balance: finalBalance };
                const nameUpper = accName.toUpperCase();
                
                // ASSETS
                if (accType === 'Asset') {
                    if (accGroup === 'CURRENT ASSET' || nameUpper.includes('CASH') || nameUpper.includes('RECEIVABLE') || nameUpper.includes('INVENTORY') || nameUpper.includes('PREPAID')) {
                        report.totalCurrentAssets += finalBalance;
                        report.breakdown.currentAssets.push(accData);
                    } else { 
                        report.totalNonCurrentAssets += finalBalance;
                        report.breakdown.nonCurrentAssets.push(accData);
                    }
                    report.totalAssets += finalBalance;
                }
                // LIABILITIES
                else if (accType === 'Liability') {
                    if (accGroup === 'LONG-TERM LIABILITY' || nameUpper.includes('MORTGAGE') || nameUpper.includes('BOND') || nameUpper.includes('LONG TERM')) {
                        report.totalNonCurrentLiabilities += finalBalance;
                        report.breakdown.nonCurrentLiabilities.push(accData);
                    } else { 
                        report.totalCurrentLiabilities += finalBalance;
                        report.breakdown.currentLiabilities.push(accData);
                    }
                    report.totalLiabilities += finalBalance;
                }
                // EQUITY
                else if (accType === 'Equity') {
                    report.totalEquity += finalBalance;
                    report.breakdown.equity.push(accData);
                }
                // REVENUE
                else if (accType === 'Revenue') {
                    report.totalRevenue += finalBalance;
                    report.breakdown.revenue.push(accData);
                }
                // EXPENSES
                else if (accType === 'Expense') {
                    if (accGroup === 'COGS' || nameUpper.includes('COST OF GOODS') || nameUpper.includes('COST OF SALES')) {
                        report.totalCogs += finalBalance;
                        report.breakdown.cogs.push(accData);
                    } else if (nameUpper.includes('TAX') || nameUpper.includes('INTEREST EXPENSE')) {
                        report.totalTaxesAndInterest += finalBalance;
                        report.breakdown.taxesAndInterest.push(accData);
                    } else {
                        report.totalOpex += finalBalance;
                        report.breakdown.opex.push(accData);
                    }
                }
            }
        });

        // MULTI-STEP MATH ENGINE
        report.grossProfit = report.totalRevenue - report.totalCogs;
        report.operatingIncome = report.grossProfit - report.totalOpex;
        report.netIncome = report.operatingIncome - report.totalTaxesAndInterest;

        // INJECT RETAINED EARNINGS TO BALANCE SHEET
        report.breakdown.equity.push({
            name: 'Current Year Retained Earnings (Net Income)',
            code: '3999',
            balance: report.netIncome,
            isSystemGenerated: true
        });
        report.totalEquity += report.netIncome;

        // EQUATION CHECK
        const accountingEquationDiff = report.totalAssets - (report.totalLiabilities + report.totalEquity);
        const isBalanced = Math.abs(accountingEquationDiff) < 0.001;

        res.status(200).json({ success: true, isBalanced, data: report });
    } catch (error) {
        console.error("Report Controller Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==========================================
// 2. TRIAL BALANCE (The Ledger Polygraph)
// ==========================================
exports.getTrialBalance = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        
        // 🏢 SILO LOCK: Only fetch active accounts for THIS division
        const accounts = await Account.find({ division: targetDivision, isActive: true }).sort({ accountCode: 1 });

        let totalDebit = 0;
        let totalCredit = 0;
        const reportLines = [];

        accounts.forEach(acc => {
            if (acc.currentBalance === 0) return;

            let debit = 0;
            let credit = 0;

            if (acc.normalBalance === 'Debit') {
                if (acc.currentBalance > 0) debit = acc.currentBalance;
                else credit = Math.abs(acc.currentBalance); 
            } else {
                if (acc.currentBalance > 0) credit = acc.currentBalance;
                else debit = Math.abs(acc.currentBalance);
            }

            totalDebit += debit;
            totalCredit += credit;

            reportLines.push({
                accountCode: acc.accountCode || acc.code,
                accountName: acc.accountName || acc.name,
                type: acc.accountType || acc.type,
                debit,
                credit
            });
        });

        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

        res.status(200).json({ 
            success: true, 
            isBalanced,
            message: isBalanced ? "Ledger is perfectly balanced." : "WARNING: Ledger is out of balance!",
            data: { 
                lines: reportLines, 
                totals: { debit: totalDebit, credit: totalCredit } 
            } 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
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

// @desc    Generate a Trial Balance Report
// @route   GET /api/reports/trial-balance
// @access  Private (Admin / Finance)
exports.getTrialBalance = async (req, res) => {
    try {
        // 🏢 1. SILO LOCK: Get the Division
        const targetDivision = req.headers['x-division-id'] || req.user?.division;
        if (!targetDivision) {
            return res.status(400).json({ success: false, message: 'Division context is missing.' });
        }

        // Force to ObjectId for Aggregation matching
        const divisionId = new mongoose.Types.ObjectId(
            targetDivision._id ? targetDivision._id.toString() : targetDivision.toString()
        );

        // 📅 Optional: Allow filtering 'As Of' a specific date
        const asOfDate = req.query.date ? new Date(req.query.date) : new Date();

        // 🚀 2. THE ENTERPRISE AGGREGATION PIPELINE
        const trialBalance = await JournalEntry.aggregate([
            // Step A: Filter by Division AND Date
            { 
                $match: { 
                    division: divisionId,
                    postingDate: { $lte: asOfDate },
                    status: 'Posted' // Ignore Drafts or Voided entries
                } 
            },
            // Step B: Break apart the 'lines' array into individual documents
            { $unwind: "$lines" },
            // Step C: Group by the Account ID and sum up all Debits and Credits
            {
                $group: {
                    _id: "$lines.account",
                    totalDebit: { $sum: "$lines.debit" },
                    totalCredit: { $sum: "$lines.credit" }
                }
            },
            // Step D: Join (Lookup) with the Account collection to get the names
            {
                $lookup: {
                    from: "accounts", // Mongoose pluralizes collection names automatically
                    localField: "_id",
                    foreignField: "_id",
                    as: "accountDetails"
                }
            },
            // Step E: Flatten the Account details array
            { $unwind: "$accountDetails" },
            // Step F: Format the final output cleanly
            {
                $project: {
                    _id: 0,
                    accountId: "$_id",
                    accountCode: { $ifNull: ["$accountDetails.accountCode", "$accountDetails.code"] },
                    accountName: { $ifNull: ["$accountDetails.accountName", "$accountDetails.name"] },
                    type: { $ifNull: ["$accountDetails.accountType", "$accountDetails.type"] },
                    totalDebit: 1,
                    totalCredit: 1,
                    // Calculate the net balance based on Account Type rules (GAAP)
                    balance: {
                        $cond: {
                            if: { $in: [{ $ifNull: ["$accountDetails.accountType", "$accountDetails.type"] }, ["Asset", "Expense"]] },
                            then: { $subtract: ["$totalDebit", "$totalCredit"] },
                            else: { $subtract: ["$totalCredit", "$totalDebit"] }
                        }
                    }
                }
            },
            // Step G: Sort by Account Code for a beautiful accountant-friendly view
            { $sort: { accountCode: 1 } }
        ]);

        // ⚖️ 3. CALCULATE THE GRAND TOTALS (The Auditor's Proof)
        let systemTotalDebit = 0;
        let systemTotalCredit = 0;

        trialBalance.forEach(row => {
            systemTotalDebit += row.totalDebit;
            systemTotalCredit += row.totalCredit;
        });

        // Floating point math fix
        systemTotalDebit = Math.round(systemTotalDebit * 100) / 100;
        systemTotalCredit = Math.round(systemTotalCredit * 100) / 100;

        const isBalanced = systemTotalDebit === systemTotalCredit;

        res.status(200).json({
            success: true,
            data: {
                asOf: asOfDate,
                isBalanced,
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

exports.getIncomeStatement = async (req, res) => {
  const targetDivision = req.headers['x-division-id'];
  const { period } = req.query; // Format: 'YYYY-MM'

  if (!targetDivision) return res.status(400).json({ error: 'Division ID required' });

  try {
    const pipeline = [
      { $match: { division: mongoose.Types.ObjectId(targetDivision), period } },
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
          _id: { type: "$accountDetails.type", name: "$accountDetails.name", code: "$accountDetails.code" },
          totalDebit: { $sum: "$lines.debit" },
          totalCredit: { $sum: "$lines.credit" }
        }
      },
      {
        $project: {
          type: "$_id.type", name: "$_id.name", code: "$_id.code",
          balance: {
            $cond: {
              if: { $eq: ["$_id.type", "Revenue"] },
              then: { $subtract: ["$totalCredit", "$totalDebit"] }, // Revenue: Normal Credit
              else: { $subtract: ["$totalDebit", "$totalCredit"] }  // COGS & Expense: Normal Debit
            }
          }
        }
      },
      {
        $group: {
          _id: "$type",
          accounts: { $push: { name: "$name", code: "$code", balance: "$balance" } },
          total: { $sum: "$balance" }
        }
      }
    ];

    const results = await JournalEntry.aggregate(pipeline);

    // Initialize structured response
    const pnl = { Revenue: { total: 0, accounts: [] }, COGS: { total: 0, accounts: [] }, Expense: { total: 0, accounts: [] } };
    results.forEach(category => { pnl[category._id] = category; });

    const netIncome = pnl.Revenue.total - pnl.COGS.total - pnl.Expense.total;
    res.json({ ...pnl, NetIncome: netIncome });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
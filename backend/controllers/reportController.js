const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

exports.getFinancialSummary = async (req, res) => {
    try {
        const accounts = await Account.find().sort({ code: 1 });
        
        // MongoDB Aggregation: Fast math to sum up every debit and credit in the entire ledger
        const balances = await JournalEntry.aggregate([
            { $unwind: "$lines" },
            { $group: {
                _id: "$lines.account",
                totalDebit: { $sum: "$lines.debit" },
                totalCredit: { $sum: "$lines.credit" }
            }}
        ]);

        // The Master Financial Report Object
        let report = {
            assets: 0, liabilities: 0, equity: 0, revenue: 0, expenses: 0,
            breakdown: { assets: [], liabilities: [], equity: [], revenue: [], expenses: [] }
        };

        // Calculate the normal balance for each account type
        accounts.forEach(acc => {
            const bal = balances.find(b => String(b._id) === String(acc._id));
            const debit = bal ? bal.totalDebit : 0;
            const credit = bal ? bal.totalCredit : 0;
            let finalBalance = 0;

            // Assets & Expenses increase with Debits
            if (acc.type === 'Asset' || acc.type === 'Expense') {
                finalBalance = debit - credit;
            } 
            // Liabilities, Equity, & Revenue increase with Credits
            else { 
                finalBalance = credit - debit;
            }

            // Only include accounts that have been used (balance !== 0)
            if (finalBalance !== 0 || acc.name === 'Cash on Hand' || acc.name === 'Sales Revenue') {
                const accData = { name: acc.name, code: acc.code, balance: finalBalance };
                
                if (acc.type === 'Asset') { report.assets += finalBalance; report.breakdown.assets.push(accData); }
                if (acc.type === 'Liability') { report.liabilities += finalBalance; report.breakdown.liabilities.push(accData); }
                if (acc.type === 'Equity') { report.equity += finalBalance; report.breakdown.equity.push(accData); }
                if (acc.type === 'Revenue') { report.revenue += finalBalance; report.breakdown.revenue.push(accData); }
                if (acc.type === 'Expense') { report.expenses += finalBalance; report.breakdown.expenses.push(accData); }
            }
        });

        // The ultimate metric
        report.netIncome = report.revenue - report.expenses;

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
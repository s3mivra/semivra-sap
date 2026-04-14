const Sale = require('../models/Sale');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

// 1. Get all Unpaid or Partially Paid Sales (The AR Aging List)
exports.getUnpaidSales = async (req, res) => {
    try {
        const unpaidSales = await Sale.find({ 
            status: 'Unpaid', 
            balanceDue: { $gt: 0 } 
        }).sort({ createdAt: 1 }); // Oldest debts first!
        
        res.status(200).json({ success: true, data: unpaidSales });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. Receive a Debt Payment
exports.receivePayment = async (req, res) => {
    try {
        const { amount, method, reference } = req.body;
        const sale = await Sale.findById(req.params.id);

        if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
        if (sale.balanceDue <= 0) return res.status(400).json({ success: false, message: 'This invoice is already paid in full.' });
        if (amount > sale.balanceDue) return res.status(400).json({ success: false, message: `Payment exceeds balance due. Max allowed: ₱${sale.balanceDue}` });

        // A. Update the Sale Record
        sale.payments.push({ amount, method, reference });
        sale.balanceDue = Number((sale.balanceDue - amount).toFixed(2));
        
        if (sale.balanceDue === 0) {
            sale.status = 'Paid'; // Debt completely cleared!
        }
        await sale.save();

        // B. AUTOMATION: Post the Accounting Journal (Debit Cash, Credit AR)
        // Note: Using a forgiving search in case you renamed your accounts earlier!
        const cashAccount = await Account.findOne({ $or: [{ accountName: { $regex: /Cash/i } }, { name: { $regex: /Cash/i } }] });
        const arAccount = await Account.findOne({ $or: [{ accountName: { $regex: /Accounts Receivable/i } }, { name: { $regex: /Accounts Receivable/i } }] });

        if (cashAccount && arAccount) {
            const targetDate = new Date();
            const period = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
            
            const entryCount = await JournalEntry.countDocuments({ period });
            const entryNumber = `RCV-${period}-${String(entryCount + 1).padStart(4, '0')}`;

            await JournalEntry.create({
                entryNumber,
                documentDate: targetDate,
                period,
                description: `AR Payment Received - ${sale.orNumber || 'Invoice'} (${sale.customerName})`,
                sourceDocument: sale._id,
                lines: [
                    { account: cashAccount._id, debit: amount, credit: 0, memo: `Payment via ${method}` },
                    { account: arAccount._id, debit: 0, credit: amount, memo: 'Reducing Customer Debt' }
                ],
                postedBy: req.user.id || req.user._id
            });
        }

        res.status(200).json({ success: true, message: 'Payment recorded successfully!', data: sale });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. 🚨 NEW: The AR Aging Engine (Uses your Sale model for perfect accuracy)
exports.getARAgingReport = async (req, res) => {
    try {
        // Find all sales where money is still owed
        const unpaidSales = await Sale.find({
            status: 'Unpaid',
            balanceDue: { $gt: 0 }
        });

        const agingData = {};
        const today = new Date();

        unpaidSales.forEach(sale => {
            const customer = sale.customerName || 'Walk-in Customer';
            const netAmount = sale.balanceDue;

            // Initialize customer bucket if they aren't in the list yet
            if (!agingData[customer]) {
                agingData[customer] = {
                    customerName: customer,
                    current: 0,
                    days31to60: 0,
                    days61to90: 0,
                    over90: 0,
                    total: 0
                };
            }

            // Calculate how old this debt is based on the creation date
            const docDate = new Date(sale.createdAt || sale.date);
            const diffTime = Math.abs(today - docDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Drop the debt into the correct risk bucket
            if (diffDays <= 30) {
                agingData[customer].current += netAmount;
            } else if (diffDays <= 60) {
                agingData[customer].days31to60 += netAmount;
            } else if (diffDays <= 90) {
                agingData[customer].days61to90 += netAmount;
            } else {
                agingData[customer].over90 += netAmount;
            }

            agingData[customer].total += netAmount;
        });

        const finalReport = Object.values(agingData);

        // Add up everything for the top dashboard cards
        const grandTotals = finalReport.reduce((acc, curr) => {
            acc.current += curr.current;
            acc.days31to60 += curr.days31to60;
            acc.days61to90 += curr.days61to90;
            acc.over90 += curr.over90;
            acc.total += curr.total;
            return acc;
        }, { current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 });

        res.status(200).json({ success: true, data: { records: finalReport, grandTotals } });

    } catch (error) {
        console.error("AR Aging Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
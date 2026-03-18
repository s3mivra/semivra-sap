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
        if (amount > sale.balanceDue) return res.status(400).json({ success: false, message: `Payment exceeds balance due. Max allowed: $${sale.balanceDue}` });

        // A. Update the Sale Record
        sale.payments.push({ amount, method, reference });
        sale.balanceDue = Number((sale.balanceDue - amount).toFixed(2));
        
        if (sale.balanceDue === 0) {
            sale.status = 'Paid'; // Debt completely cleared!
        }
        await sale.save();

        // B. AUTOMATION: Post the Accounting Journal (Debit Cash, Credit AR)
        const cashAccount = await Account.findOne({ name: 'Cash on Hand' });
        const arAccount = await Account.findOne({ name: 'Accounts Receivable' });

        if (cashAccount && arAccount) {
            const entryCount = await JournalEntry.countDocuments();
            const entryNumber = `JRN-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}`;

            await JournalEntry.create({
                entryNumber,
                date: Date.now(),
                description: `AR Payment Received - ${sale.orNumber} (${sale.customerName})`,
                sourceDocument: sale._id,
                lines: [
                    { account: cashAccount._id, debit: amount, credit: 0, memo: `Payment via ${method}` },
                    { account: arAccount._id, debit: 0, credit: amount, memo: 'Reducing Customer Debt' }
                ],
                postedBy: req.user.id
            });
        }

        res.status(200).json({ success: true, message: 'Payment recorded successfully!', data: sale });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
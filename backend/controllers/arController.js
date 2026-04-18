const Sale = require('../models/Sale');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

// @desc    Get all unpaid invoices grouped by Customer
// @route   GET /api/ar/unpaid
// @access  Private
// @desc    Get all unpaid invoices grouped by Customer
// @route   GET /api/ar/unpaid
// @access  Private
// @desc    Get all unpaid invoices grouped by Customer
// @route   GET /api/ar/unpaid
// @access  Private
// @desc    Get all unpaid invoices (Flat List for the Table)
// @route   GET /api/ar/unpaid
// @access  Private
// @desc    Get all unpaid invoices (Flat List for the Table)
// @route   GET /api/ar/unpaid
// @access  Private
exports.getUnpaidReceivables = async (req, res) => {
    try {
        const targetDivision = req.headers['x-division-id'] || req.user?.division;
        if (!targetDivision) return res.status(400).json({ success: false, message: 'Division missing' });

        // 1. Grab the receipts and try to populate the real Customer profile if it exists
        const unpaidSales = await Sale.find({
            division: targetDivision,
            balanceDue: { $gt: 0 },
            status: { $ne: 'Voided' }
        })
        .populate('customer', 'name') // 👈 Tries to grab the real name
        .sort({ createdAt: -1 });

        // 2. 🛡️ THE FIX: Safely map over the results and enforce the "Walk-in" label
        const formattedSales = unpaidSales.map(sale => {
            const saleObj = sale.toObject(); // Convert Mongoose document to plain JavaScript object
            // Fallback logic: Use Profile Name -> OR use POS Typed Name -> OR use "Walk-in"
            saleObj.customerName = sale.customer?.name || sale.customerName || 'Walk-in';
            return saleObj;
        });

        // Send the perfectly formatted array straight to React
        res.status(200).json({ success: true, data: formattedSales });

    } catch (error) {
        console.error("🔥 AR ERROR:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch Accounts Receivable.' });
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
        // B. AUTOMATION: Post the Accounting Journal (Smart Routing)
        let targetAssetAccount;
        
        // 💵 1. CASH: Goes to the physical drawer (Code 1000)
        if (method === 'Cash') {
            targetAssetAccount = await Account.findOne({ $or: [{ code: '1000' }, { accountCode: '1000' }], division: sale.division });
        } 
        // 💳📱 2. CARD/GCASH/BANK: Goes straight to the Bank (Code 1010)
        else {
            targetAssetAccount = await Account.findOne({ $or: [{ code: '1010' }, { accountCode: '1010' }], division: sale.division });
        }

        const arAccount = await Account.findOne({ $or: [{ code: '1200' }, { accountCode: '1200' }], division: sale.division });

        if (targetAssetAccount && arAccount) {
            const targetDate = new Date();
            const period = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
            
            const entryCount = await JournalEntry.countDocuments({ period });
            const entryNumber = `RCV-${period}-${String(entryCount + 1).padStart(4, '0')}`;

            await JournalEntry.create({
                entryNumber,
                documentDate: targetDate,
                date: targetDate,
                period,
                division: sale.division,
                // 🛡️ THE FIX: Add the Walk-in fallback right into the ledger description!
                description: `AR Payment Received - ${sale.orNumber || 'Invoice'} (${sale.customerName || 'Walk-in'})`,
                sourceDocument: sale._id,
                lines: [
                    { account: targetAssetAccount._id, debit: amount, credit: 0, memo: `Payment via ${method}` },
                    { account: arAccount._id, debit: 0, credit: amount, memo: 'Reducing Customer Debt' }
                ],
                postedBy: req.user.id || req.user._id
            });
            
            // Real-time ledger update
            targetAssetAccount.currentBalance = (targetAssetAccount.currentBalance || 0) + amount;
            arAccount.currentBalance = (arAccount.currentBalance || 0) - amount;
            await Promise.all([targetAssetAccount.save(), arAccount.save()]);
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

// @desc    Get a detailed Statement of Account for ONE Customer
// @route   GET /api/ar/statement/:customerId
// @access  Private
exports.getCustomerStatement = async (req, res) => {
    try {
        const { customerId } = req.params;
        const targetDivision = req.headers['x-division-id'] || req.user?.division;
        if (!targetDivision) return res.status(400).json({ success: false, message: 'Division context missing.' });

        const divIdString = targetDivision._id ? targetDivision._id.toString() : targetDivision.toString();

        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

        // Fetch all sales for this specific customer in this division
        const invoices = await Sale.find({ 
            customer: customerId, 
            division: divIdString,
            status: { $ne: 'Voided' }
        }).sort({ createdAt: -1 });

        // Calculate totals
        const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalPaid = invoices.reduce((sum, inv) => sum + (inv.totalAmount - (inv.balance || 0)), 0);
        const currentBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                customer: { name: customer.name, email: customer.email, phone: customer.phone },
                summary: { totalBilled, totalPaid, currentBalance },
                invoices
            }
        });
    } catch (error) {
        console.error("Statement Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
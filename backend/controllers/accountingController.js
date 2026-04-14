const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const PurchaseOrder = require('../models/PurchaseOrder');
const Bill = require('../models/Bill');
const FinancialPeriod = require('../models/FinancialPeriod');
const mongoose = require('mongoose');

// Helper to get the active division (Super Admins can pass it in the body/query)
const getDivision = (req) => {
    if (req.user.role === 'Super Admin' && (req.body.division || req.query.division)) {
        return req.body.division || req.query.division;
    }
    return req.user.division;
};

// ==========================================
// CHART OF ACCOUNTS (CoA) MANAGEMENT
// ==========================================

exports.createAccount = async (req, res) => {
    try {
        const { accountCode, code, accountName, name, accountType, type, normalBalance, description } = req.body;
        
        // 👇 THE ENTERPRISE SECURITY FIX 👇
        let targetDivision;
        
        if (req.user?.role?.level === 100) {
            targetDivision = req.headers['x-division-id'];
        } else {
            // Force the ID into a clean string so Mongoose never gets confused!
            const userDiv = req.user?.division;
            targetDivision = userDiv?._id ? userDiv._id.toString() : userDiv?.toString();
        }

        if (!targetDivision) {
            return res.status(400).json({ success: false, message: 'Division context is missing. Please contact IT.' });
        }
        // 👆 ================================= 👆
        const finalAccountName = accountName || name;
        const finalAccountType = accountType || type || 'Asset';
        const finalAccountCode = accountCode || code || `ACC-${Math.floor(1000 + Math.random() * 9000)}`;

        if (!finalAccountName) return res.status(400).json({ success: false, message: "Account Name is required." });

        const newAccount = await Account.create({
            division: targetDivision, // 🏢 Locked to Division
            accountCode: finalAccountCode,
            code: finalAccountCode,
            accountName: finalAccountName,
            name: finalAccountName,
            accountType: finalAccountType,
            type: finalAccountType,
            normalBalance: normalBalance || (['Asset', 'Expense'].includes(finalAccountType) ? 'Debit' : 'Credit'),
            description: description || `Standard ${finalAccountType} account`
        });

        res.status(201).json({ success: true, data: newAccount });
    } catch (error) {
        console.error("🔥 Create Account Error:", error.message);
        if (error.code === 11000) return res.status(400).json({ success: false, message: "An account with this Code already exists in this division." });
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAccounts = async (req, res) => {
    try {
        let targetDivision;

        // 1. Resolve the target division securely
        if (req.user?.role?.level === 100) {
            targetDivision = req.headers['x-division-id'];
        } else {
            targetDivision = req.user?.division;
        }

        if (!targetDivision) {
            return res.status(400).json({ success: false, message: 'Division context is missing.' });
        }

        // 2. Force extract the pure string ID (Handles if it's an object or raw string)
        const divIdString = targetDivision._id ? targetDivision._id.toString() : targetDivision.toString();

        // 🚨 3. THE X-RAY: Watch your backend terminal when John logs in! 🚨
        console.log(`\n=== 🕵️ SILO DEBUG: ${req.user.name} ===`);
        console.log(`Target Division ID: "${divIdString}"`);

        // 🛡️ 4. THE BULLETPROOF FAILSAFE
        // Query using BOTH String and ObjectId formats. 
        // This guarantees Mongoose finds the data regardless of how it was saved in the schema!
        const accounts = await Account.find({
            $or: [
                { division: divIdString },
                { division: new mongoose.Types.ObjectId(divIdString) }
            ]
        }).sort({ accountCode: 1 });

        console.log(`Accounts Found: ${accounts.length}`);
        console.log(`===================================\n`);

        res.status(200).json({ success: true, data: accounts });
    } catch (error) {
        console.error("Error fetching accounts:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        // 🏢 Ensure they can only delete an account that belongs to their division
        const deletedAccount = await Account.findOneAndDelete({ _id: req.params.id, division: getDivision(req) });
        
        if (!deletedAccount) return res.status(404).json({ success: false, message: "Account not found or access denied." });
        res.status(200).json({ success: true, message: "Account deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete account." });
    }
};

// ==========================================
// JOURNAL ENTRIES (THE GENERAL LEDGER)
// ==========================================

exports.postJournalEntry = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        // 👈 CRITICAL FIX: Wrap in ACID Transaction
        await session.withTransaction(async () => {
            const { date, documentDate, description, sourceDocument, lines } = req.body;
            const targetDate = documentDate || date || Date.now();
            const targetDivision = getDivision(req);

            if (!lines || lines.length < 2) throw new Error("Requires at least two lines.");

            const dDate = new Date(targetDate);
            const period = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
            
            const periodStatus = await FinancialPeriod.findOne({ division: targetDivision, periodCode: period }).session(session);
            if (periodStatus && periodStatus.status === 'Closed') {
                throw new Error(`CRITICAL STOP: The financial period (${period}) is CLOSED.`);
            }

            const entryCount = await JournalEntry.countDocuments({ period, division: targetDivision }).session(session);
            const entryNumber = `JRN-${period}-${String(entryCount + 1).padStart(4, '0')}`;

            // Pass the { session } to the creation
            const journalEntry = await JournalEntry.create([{
                division: targetDivision,
                entryNumber,
                documentDate: targetDate,
                date: targetDate,
                period,
                description,
                sourceDocument,
                lines,
                postedBy: req.user.id || req.user._id
            }], { session });

            // Pass the { session } to the balance updates
            for (let line of lines) {
                const account = await Account.findOne({ _id: line.account, division: targetDivision }).session(session);
                if (account) {
                    const accType = account.accountType || account.type;
                    if (['Asset', 'Expense'].includes(accType)) {
                        account.currentBalance = (account.currentBalance || 0) + (Number(line.debit) || 0) - (Number(line.credit) || 0);
                    } else {
                        account.currentBalance = (account.currentBalance || 0) + (Number(line.credit) || 0) - (Number(line.debit) || 0);
                    }
                    await account.save({ session }); // 👈 Lock the save to the transaction
                }
            }
        });

        res.status(201).json({ success: true, message: 'Journal Entry posted successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

exports.getJournalEntries = async (req, res) => {
    try {
        const entries = await JournalEntry.find({ division: getDivision(req) })
            .populate('postedBy', 'name email')
            .populate('lines.account', 'code accountCode name accountName type accountType')
            .sort({ documentDate: -1, date: -1, createdAt: -1 });
            
        res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.voidJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { voidReason } = req.body;
        const targetDivision = getDivision(req);

        if (!voidReason) return res.status(400).json({ success: false, message: "A reason is required to void." });

        // 🏢 Locked to division
        const entry = await JournalEntry.findOne({ _id: id, division: targetDivision });
        if (!entry) return res.status(404).json({ success: false, message: "Entry not found or access denied." });
        if (entry.status === 'Voided') return res.status(400).json({ success: false, message: "Already voided." });

        for (let line of entry.lines) {
            const account = await Account.findOne({ _id: line.account, division: targetDivision });
            if (account) {
                const accType = account.accountType || account.type;
                if (['Asset', 'Expense'].includes(accType)) {
                    account.currentBalance -= (Number(line.debit) || 0) - (Number(line.credit) || 0);
                } else {
                    account.currentBalance -= (Number(line.credit) || 0) - (Number(line.debit) || 0);
                }
                await account.save();
            }
        }

        entry.status = 'Voided';
        entry.voidReason = voidReason;
        entry.voidedAt = Date.now();
        entry.voidedBy = req.user.id || req.user._id;
        await entry.save();

        res.status(200).json({ success: true, message: "Entry successfully voided.", data: entry });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// ==========================================
// ACCOUNTS PAYABLE & PURCHASING
// ==========================================
exports.getUnpaidBills = async (req, res) => {
    try {
        // 🏢 1. SILO LOCK: Get the Division safely
        const targetDivision = req.headers['x-division-id'] || req.user?.division;
        if (!targetDivision) {
            return res.status(400).json({ success: false, message: 'Division context is missing.' });
        }

        const divisionIdString = targetDivision._id ? targetDivision._id.toString() : targetDivision.toString();

        // 🧾 2. FETCH FROM THE TRUE ACCOUNTING COLLECTION
        // We now query the actual 'Bill' collection instead of hacking the Purchase Orders
        const unpaidBills = await Bill.find({
            division: divisionIdString,
            balanceDue: { $gt: 0 },
            status: { $ne: 'Voided' }
        })
        .populate('supplier', 'name email phone')
        .populate('purchaseOrder', 'poNumber') // Bring in the PO number for reference
        .sort({ dueDate: 1 }); // Sort by closest due date first!

        // 💰 3. CALCULATE GRAND TOTAL FOR THE DASHBOARD
        const grandTotalAP = unpaidBills.reduce((sum, bill) => sum + (bill.balanceDue || 0), 0);

        res.status(200).json({ 
            success: true, 
            data: unpaidBills,           // The flat array for your React Table
            grandTotal: grandTotalAP     // The total debt for your KPI Cards
        });

    } catch (error) {
        console.error("AP Fetch Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.recordPayment = async (req, res) => {
    try {
        const { purchaseOrderId, amount } = req.body;
        const targetDivision = getDivision(req);

        const po = await PurchaseOrder.findOne({ _id: purchaseOrderId, division: targetDivision });
        if (!po) return res.status(404).json({ success: false, message: 'PO not found or access denied' });

        const currentBalance = po.balance !== undefined ? po.balance : po.totalAmount;
        po.balance = currentBalance - amount;

        if (po.balance <= 0) {
            po.balance = 0;
            po.status = 'Paid';
        }
        await po.save();

        // 🏢 ONLY search for AP and Cash accounts within this specific division!
        const apAccount = await Account.findOne({ 
            division: targetDivision,
            $or: [{ name: 'Accounts Payable' }, { accountName: 'Accounts Payable' }] 
        });
        const cashAccount = await Account.findOne({ 
            division: targetDivision,
            $or: [{ name: 'Cash on Hand' }, { accountName: 'Cash on Hand' }, { name: 'Cash in Bank' }] 
        }); 

        if (apAccount && cashAccount) {
            const targetDate = Date.now();
            const dDate = new Date(targetDate);
            const period = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
            const entryCount = await JournalEntry.countDocuments({ period, division: targetDivision });
            const entryNumber = `JRN-${period}-${String(entryCount + 1).padStart(4, '0')}`;

            await JournalEntry.create({
                division: targetDivision, // 🏢 Locked to division
                entryNumber,
                documentDate: targetDate,
                date: targetDate,
                period,
                description: `Payment to Supplier for ${po.poNumber}`,
                sourceDocument: po._id,
                lines: [
                    { account: apAccount._id, debit: amount, credit: 0, memo: 'Reducing AP Debt' },
                    { account: cashAccount._id, debit: 0, credit: amount, memo: 'Cash paid to Supplier' }
                ],
                postedBy: req.user.id || req.user._id
            });

            apAccount.currentBalance = (apAccount.currentBalance || 0) - amount; 
            cashAccount.currentBalance = (cashAccount.currentBalance || 0) - amount; 
            
            await apAccount.save();
            await cashAccount.save();
        } else {
            console.error("CRITICAL: Missing AP or Cash accounts for this division!");
        }

        res.status(200).json({ success: true, message: 'Payment recorded successfully' });
    } catch (error) {
        console.error("Payment Error:", error); 
        res.status(500).json({ success: false, error: error.message });
    }
};
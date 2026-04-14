const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const Bill = require('../models/Bill'); // 🚨 NEW: Import the AP Bill Model!
const mongoose = require('mongoose');

// --- SUPPLIER CRUD ---
exports.createSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.create(req.body);
        res.status(201).json({ success: true, data: supplier });
    } catch (error) { res.status(400).json({ success: false, error: error.message }); }
};

exports.getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find({ isActive: true })
            .populate('catalog.product', 'name sku'); 
        res.status(200).json({ success: true, data: suppliers });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// --- NEW: LINK PRODUCT TO SUPPLIER CATALOG ---
exports.addCatalogItem = async (req, res) => {
    try {
        const { productId, defaultCost } = req.body;
        const supplier = await Supplier.findById(req.params.id);
        
        if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

        const existingIndex = supplier.catalog.findIndex(item => item.product.toString() === productId);
        if (existingIndex > -1) {
            supplier.catalog[existingIndex].defaultCost = defaultCost; 
        } else {
            supplier.catalog.push({ product: productId, defaultCost });
        }

        await supplier.save();
        res.status(200).json({ success: true, message: 'Catalog updated!', data: supplier });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// --- PURCHASE ORDERS ---
exports.createPO = async (req, res) => {
    try {
        const { supplier, items, totalAmount, paymentMethod } = req.body;

        const newPO = await PurchaseOrder.create({
            poNumber: `PO-${Date.now()}`,
            supplier,
            items,
            totalAmount,
            status: 'Ordered', 
            paymentMethod: paymentMethod || 'Cash', 
            balance: (paymentMethod === 'Terms' || paymentMethod === 'AP') ? totalAmount : 0,
            createdBy: req.user.id 
        });

        res.status(201).json({ success: true, data: newPO });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPOs = async (req, res) => {
    try {
        const pos = await PurchaseOrder.find()
            .populate('supplier', 'name')
            .populate('items.product', 'name sku isPhysical')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: pos });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// --- AUTOMATION: RECEIVE THE PO ---
exports.receivePO = async (req, res) => {
    // 🛡️ 1. START THE ACID TRANSACTION
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const poId = req.params.id;
        const { warehouseId, paymentMethod } = req.body; 

        // 🏢 ENTERPRISE FIX: Grab the secure division header
        const targetDivision = req.headers['x-division-id'] || req.user?.division;
        const divIdString = targetDivision?._id ? targetDivision._id.toString() : targetDivision?.toString();

        if (!divIdString) throw new Error("Division context is missing. Cannot receive PO.");

        // Read the PO within the transaction
        const po = await PurchaseOrder.findById(poId).session(session);
        if (!po) throw new Error('PO not found');

        // 🔥 THE FIREWALL: Stop the Double-Dip!
        if (po.status === 'Received') {
            throw new Error('This Purchase Order has already been received into inventory.');
        }
        if (!warehouseId) throw new Error('Destination warehouse required');

        if (paymentMethod) po.paymentMethod = paymentMethod;
        
        if (po.paymentMethod === 'Terms' || po.paymentMethod === 'AP') {
            po.balance = po.totalAmount;
        } else {
            po.balance = 0; 
        }

        // 2. 📦 ADD STOCK & CALCULATE MOVING AVERAGE COST
        for (let item of po.items) {
            const productInfo = await Product.findById(item.product).session(session);
            
            if (productInfo && productInfo.isPhysical) {
                const oldTotalValue = productInfo.currentStock * (productInfo.averageCost || 0);
                const newReceiptValue = item.quantity * item.unitCost;
                const newTotalStock = productInfo.currentStock + item.quantity;
                
                const newAverageCost = (oldTotalValue + newReceiptValue) / newTotalStock;
                
                productInfo.averageCost = Number(newAverageCost.toFixed(2));
                productInfo.currentStock = newTotalStock;
                await productInfo.save({ session });

                await StockMovement.create([{
                    division: divIdString, // Map to silo
                    product: item.product,
                    warehouse: warehouseId,
                    type: 'IN',
                    quantity: item.quantity,
                    reference: `Received PO: ${po.poNumber}`,
                    processedBy: req.user.id
                }], { session });
            }
        }

        // 3. 🏦 FETCH REQUIRED ACCOUNTS (LOCKED TO DIVISION!)
        const inventoryAccount = await Account.findOne({ division: divIdString, $or: [{ name: /Inventory Asset/i }, { accountName: /Inventory Asset/i }] }).session(session);
        
        let creditAccount;
        if (po.paymentMethod === 'Terms' || po.paymentMethod === 'AP') {
            creditAccount = await Account.findOne({ division: divIdString, $or: [{ name: /Accounts Payable/i }, { accountName: /Accounts Payable/i }] }).session(session);
        } else {
            creditAccount = await Account.findOne({ division: divIdString, $or: [{ name: /Cash/i }, { accountName: /Cash/i }] }).session(session);
        }

        // We throw an error if the accounts don't exist instead of auto-creating them, 
        // to force the accountant to map their Chart of Accounts correctly.
        if (!inventoryAccount || !creditAccount) {
            throw new Error(`CRITICAL: Missing Core Accounts. Please ensure 'Inventory Asset' and '${po.paymentMethod === 'Terms' ? 'Accounts Payable' : 'Cash'}' exist in this division's Chart of Accounts.`);
        }

        // 4. 📝 CONSTRUCT AND POST THE JOURNAL ENTRY
        const targetDate = new Date();
        const period = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        const entryCount = await JournalEntry.countDocuments({ division: divIdString, period }).session(session);
        const entryNumber = `JRN-PO-${period}-${String(entryCount + 1).padStart(4, '0')}`;

        const automatedEntry = await JournalEntry.create([{
            division: divIdString,
            entryNumber,
            documentDate: targetDate,
            postingDate: targetDate,
            period,
            description: `Inventory Purchase - ${po.poNumber}`,
            sourceDocument: po._id.toString(),
            status: 'Posted',
            postedBy: req.user.id,
            lines: [
                { account: inventoryAccount._id, debit: po.totalAmount, credit: 0, memo: 'Inventory Received' },
                { 
                    account: creditAccount._id, 
                    debit: 0, 
                    credit: po.totalAmount, 
                    memo: (po.paymentMethod === 'Terms' || po.paymentMethod === 'AP') ? 'Debt to Supplier' : 'Cash Paid to Supplier',
                    subsidiaryId: po.supplier // Links this debt directly to the vendor!
                }
            ]
        }], { session });

        // ⚖️ Update Running Account Balances
        for (let line of automatedEntry[0].lines) {
            const acc = await Account.findById(line.account).session(session);
            if (acc) {
                const accType = acc.accountType || acc.type;
                if (['Asset', 'Expense'].includes(accType)) {
                    acc.currentBalance = (acc.currentBalance || 0) + line.debit - line.credit;
                } else {
                    acc.currentBalance = (acc.currentBalance || 0) + line.credit - line.debit;
                }
                await acc.save({ session });
            }
        }

        // 🚨 5. AUTOMATION: SPAWN THE ACCOUNTS PAYABLE BILL
        if (po.paymentMethod === 'Terms' || po.paymentMethod === 'AP') {
            const existingBill = await Bill.findOne({ purchaseOrder: po._id }).session(session);
            
            if (!existingBill) {
                await Bill.create([{
                    division: divIdString, // Map to Silo
                    supplier: po.supplier,
                    purchaseOrder: po._id,
                    amount: po.totalAmount,
                    balanceDue: po.totalAmount,
                    status: 'Unpaid',
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
                    description: `Automated AP Bill for ${po.poNumber}`
                }], { session });
            }
        }

        // 6. Mark PO as Received & Save ALL updates
        po.status = 'Received';
        po.receivedAt = Date.now();
        po.receivingWarehouse = warehouseId;
        await po.save({ session }); 

        // ✅ 7. COMMIT TRANSACTION
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: 'PO Received, Stock Updated, Bill Created, and Ledger Posted!', data: po });
    } catch (error) {
        // 🛑 THE FAILSAFE: UNDO EVERYTHING
        await session.abortTransaction();
        session.endSession();
        console.error("🔥 PO Receiving Error:", error.message);
        res.status(400).json({ success: false, error: error.message });
    }
};
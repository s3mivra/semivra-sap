const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const Bill = require('../models/Bill'); // 🚨 NEW: Import the AP Bill Model!

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
    try {
        const poId = req.params.id;
        const { warehouseId, paymentMethod } = req.body; 

        const po = await PurchaseOrder.findById(poId);
        if (!po) return res.status(404).json({ error: 'PO not found' });

        // 🔥 THE FIREWALL: Stop the Double-Dip!
        if (po.status === 'Received') {
            return res.status(400).json({ error: 'This Purchase Order has already been received into inventory.' });
        }
        if (!warehouseId) return res.status(400).json({ success: false, message: 'Destination warehouse required' });

        if (paymentMethod) {
            po.paymentMethod = paymentMethod;
        }
        
        if (po.paymentMethod === 'Terms' || po.paymentMethod === 'AP') {
            po.balance = po.totalAmount;
        } else {
            po.balance = 0; 
        }

        // 1. AUTOMATION: Add Stock & Calculate Moving Average Cost
        for (let item of po.items) {
            const productInfo = await Product.findById(item.product);
            
            if (productInfo && productInfo.isPhysical) {
                const oldTotalValue = productInfo.currentStock * (productInfo.averageCost || 0);
                const newReceiptValue = item.quantity * item.unitCost;
                const newTotalStock = productInfo.currentStock + item.quantity;
                
                const newAverageCost = (oldTotalValue + newReceiptValue) / newTotalStock;
                
                productInfo.averageCost = Number(newAverageCost.toFixed(2));
                productInfo.currentStock = newTotalStock;
                await productInfo.save();

                await StockMovement.create({
                    product: item.product,
                    warehouse: warehouseId,
                    type: 'IN',
                    quantity: item.quantity,
                    reference: `Received PO: ${po.poNumber}`,
                    processedBy: req.user.id
                });
            }
        }

        // 2. AUTOMATION: Post to the General Ledger
        const inventoryAccount = await Account.findOne({ name: 'Inventory Asset' });
        
        let creditAccount;
        if (po.paymentMethod === 'Terms' || po.paymentMethod === 'AP') {
            creditAccount = await Account.findOne({ code: '2000' }) 
                || await Account.findOne({ name: 'Accounts Payable' }) 
                || await Account.create({ name: 'Accounts Payable', type: 'Liability', code: '2000', description: 'Money owed to suppliers' });
        } else {
            creditAccount = await Account.findOne({ name: 'Cash on Hand' });
        }

        if (inventoryAccount && creditAccount) {
            const entryCount = await JournalEntry.countDocuments();
            const entryNumber = `JRN-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}`;

            await JournalEntry.create({
                entryNumber,
                date: Date.now(),
                description: `Inventory Purchase - ${po.poNumber}`,
                sourceDocument: po._id,
                lines: [
                    { account: inventoryAccount._id, debit: po.totalAmount, credit: 0, memo: 'Inventory Received' },
                    { account: creditAccount._id, debit: 0, credit: po.totalAmount, memo: (po.paymentMethod === 'Terms' || po.paymentMethod === 'AP') ? 'Debt to Supplier' : 'Cash Paid to Supplier' }
                ],
                postedBy: req.user.id
            });
        } else {
            console.error("CRITICAL: Missing Core Accounts. Could not post journal.");
        }

        // 🚨 2.5 AUTOMATION: SPAWN THE ACCOUNTS PAYABLE BILL 🚨
        if (po.paymentMethod === 'Terms' || po.paymentMethod === 'AP') {
            // Double check a bill doesn't already exist just in case
            const existingBill = await Bill.findOne({ purchaseOrder: po._id });
            
            if (!existingBill) {
                await Bill.create({
                    supplier: po.supplier,
                    purchaseOrder: po._id,
                    amount: po.totalAmount,
                    balanceDue: po.totalAmount, // Starts fully unpaid
                    status: 'Unpaid',
                    // Default to Net 30 (Due in 30 days)
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
                    description: `Automated AP Bill for ${po.poNumber}`
                });
            }
        }

        // 3. Mark PO as Received & Save ALL updates
        po.status = 'Received';
        po.receivedAt = Date.now();
        po.receivingWarehouse = warehouseId;
        await po.save(); 

        res.status(200).json({ success: true, message: 'PO Received, Stock Updated, Bill Created, and Ledger Posted!', data: po });
    } catch (error) {
        console.error("PO Receiving Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
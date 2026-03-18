const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

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
            .populate('catalog.product', 'name sku'); // <-- NEW: Fetch catalog product details
        res.status(200).json({ success: true, data: suppliers });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};
// --- NEW: LINK PRODUCT TO SUPPLIER CATALOG ---
exports.addCatalogItem = async (req, res) => {
    try {
        const { productId, defaultCost } = req.body;
        const supplier = await Supplier.findById(req.params.id);
        
        if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

        // Check if product is already in their catalog. If yes, update the price. If no, add it.
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
        const { supplier, items, totalAmount } = req.body;

        const count = await PurchaseOrder.countDocuments();
        const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

        const po = await PurchaseOrder.create({
            poNumber, supplier, items, totalAmount, createdBy: req.user.id
        });

        res.status(201).json({ success: true, data: po });
    } catch (error) { res.status(400).json({ success: false, error: error.message }); }
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
        const { warehouseId } = req.body;
        const po = await PurchaseOrder.findById(req.params.id);

        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
        if (po.status === 'Received') return res.status(400).json({ success: false, message: 'PO is already received' });
        if (!warehouseId) return res.status(400).json({ success: false, message: 'Destination warehouse required' });

        // 1. AUTOMATION: Add Stock & Calculate Moving Average Cost
        for (let item of po.items) {
            const productInfo = await Product.findById(item.product);
            
            if (productInfo && productInfo.isPhysical) {
                // --- THE COSTING ENGINE ---
                // Math: ((Old Stock * Old Cost) + (New Stock * New Cost)) / Total New Stock
                const oldTotalValue = productInfo.currentStock * (productInfo.averageCost || 0);
                const newReceiptValue = item.quantity * item.unitCost;
                const newTotalStock = productInfo.currentStock + item.quantity;
                
                const newAverageCost = (oldTotalValue + newReceiptValue) / newTotalStock;
                
                // Update the product master data with the new cost and stock
                productInfo.averageCost = Number(newAverageCost.toFixed(2));
                productInfo.currentStock = newTotalStock;
                await productInfo.save();

                // Log the physical movement
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
        const cashAccount = await Account.findOne({ name: 'Cash on Hand' });

        if (inventoryAccount && cashAccount) {
            const entryCount = await JournalEntry.countDocuments();
            const entryNumber = `JRN-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}`;

            await JournalEntry.create({
                entryNumber,
                date: Date.now(),
                description: `Inventory Purchase - ${po.poNumber}`,
                sourceDocument: po._id,
                lines: [
                    { account: inventoryAccount._id, debit: po.totalAmount, credit: 0, memo: 'Inventory Received' },
                    { account: cashAccount._id, debit: 0, credit: po.totalAmount, memo: 'Payment to Supplier' }
                ],
                postedBy: req.user.id
            });
        } else {
            console.error("CRITICAL: Missing Core Accounts (Inventory Asset / Cash on Hand). Could not post journal.");
        }

        // 3. Mark PO as Received
        po.status = 'Received';
        po.receivedAt = Date.now();
        po.receivingWarehouse = warehouseId;
        await po.save();

        res.status(200).json({ success: true, message: 'PO Received, Stock Updated, and Ledger Posted!', data: po });
    } catch (error) {
        console.error("PO Receiving Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
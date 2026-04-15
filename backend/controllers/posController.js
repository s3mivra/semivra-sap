const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

const getDivision = (req) => {
    if (req.user?.role?.level === 100) {
        return req.headers['x-division-id'] || req.body.division;
    }
    return req.user?.division;
};

exports.processCheckout = async (req, res) => {
    try {
        // 1. Accept new fields from frontend
        const { items, paymentMethod, warehouseId, taxRate = 12, discountAmount = 0, customerName = 'Walk-in' } = req.body;

        const count = await Sale.countDocuments();
        const receiptNumber = `RCPT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        const orNumber = `OR-${String(count + 1).padStart(7, '0')}`;

        // 2. DYNAMIC MATH (TAX-EXCLUSIVE + DISCOUNTS)
        // Step A: Calculate the raw cost of items
        const grossSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Step B: Apply the discount BEFORE taxes
        const netSubtotal = Math.max(0, grossSubtotal - discountAmount); 
        
        // Step C: Calculate Tax
        const decimalTax = taxRate / 100;
        const vatAmount = Number((netSubtotal * decimalTax).toFixed(2));
        const finalTotalAmount = Number((netSubtotal + vatAmount).toFixed(2));

        // NEW Step D: Calculate total Cost of Goods Sold (COGS)
        let totalCOGS = 0;
        for (let item of items) {
            const prod = await Product.findById(item.product);
            if (prod && prod.isPhysical) {
                totalCOGS += (item.quantity * (prod.averageCost || 0));
            }
        }
        // ... previous code (Step 2: Dynamic Math) ...
        totalCOGS = Number(totalCOGS.toFixed(2));
        const saleStatus = paymentMethod === 'AR' ? 'Unpaid' : 'Paid';

        // ================================================================
        // 🔥 THE ZERO-STOCK FIREWALL
        // Check all physical items BEFORE creating the receipt!
        // ================================================================
        for (let item of items) {
            const checkProduct = await Product.findById(item.product);
            if (checkProduct && checkProduct.isPhysical) {
                // We use currentStock based on how your refund logic is written
                const availableStock = checkProduct.currentStock || 0; 
                if (availableStock < item.quantity) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Transaction Failed: Insufficient stock for ${checkProduct.name}. Only ${availableStock} left.` 
                    });
                }
            }
        }
        // ================================================================

        // 3. CREATE THE SALE RECORD
        const sale = await Sale.create({
            receiptNumber, 
            orNumber,
            items, 
            totalAmount: finalTotalAmount, 
            vatableSales: netSubtotal, 
            vatAmount, 
            discountAmount,
            paymentMethod, 
            customerName, 
            status: saleStatus, 
            balanceDue: saleStatus === 'Unpaid' ? finalTotalAmount : 0, 
            processedBy: req.user.id,
            division: getDivision(req) // 👈 CRITICAL FIX: Lock the sale to the tenant
        });

        // 4. AUTOMATION: Deduct Physical Stock
        for (let item of items) {
            const productInfo = await Product.findById(item.product);
            if (productInfo && productInfo.isPhysical) {
                if (!warehouseId) throw new Error("Warehouse ID is required for physical goods.");
                
                // 👉 THE FIX: Actually subtract the stock from the Master Data!
                productInfo.currentStock -= item.quantity;
                await productInfo.save();

                // INSIDE processCheckout()

                await StockMovement.create({
                    product: item.product, 
                    warehouse: warehouseId, 
                    type: 'OUT',
                    quantity: item.quantity, 
                    reference: `POS Sale: ${orNumber}`, 
                    processedBy: req.user.id,
                    division: getDivision(req) // 🛡️ ADD THIS LINE: Locks movement to the tenant
                });
            }
        }

        // 5. AUTOMATION: Professional Accounting (Cash vs Debt)
        const revenueAccount = await Account.findOne({ name: 'Sales Revenue' });
        
        // THE FIX: Search by CODE first to completely prevent E11000 Duplicate Key crashes!
        let vatAccount = await Account.findOne({ code: '2100' }) 
            || await Account.findOne({ name: 'VAT Payable' }) 
            || await Account.create({ name: 'VAT Payable', type: 'Liability', code: '2100' });
            
        let discountAccount = await Account.findOne({ code: '4100' }) 
            || await Account.findOne({ name: 'Sales Discounts' }) 
            || await Account.create({ name: 'Sales Discounts', type: 'Revenue', code: '4100' });
        
        let assetAccount;
        if (paymentMethod === 'AR') {
            assetAccount = await Account.findOne({ code: '1200' }) 
                || await Account.findOne({ name: 'Accounts Receivable' }) 
                || await Account.create({ name: 'Accounts Receivable', type: 'Asset', code: '1200', description: 'Unpaid customer debts' });
        } else {
            assetAccount = await Account.findOne({ name: 'Cash on Hand' });
        }

        // Find or create the COGS and Inventory Asset accounts
        let cogsAccount = await Account.findOne({ code: '5000' }) || await Account.findOne({ name: 'Cost of Goods Sold' }) || await Account.create({ name: 'Cost of Goods Sold', type: 'Expense', code: '5000' });
        let inventoryAccount = await Account.findOne({ code: '1500' }) || await Account.findOne({ name: 'Inventory Asset' }) || await Account.create({ name: 'Inventory Asset', type: 'Asset', code: '1500' });

        if (assetAccount && revenueAccount) {
            const entryCount = await JournalEntry.countDocuments();
            const entryNumber = `JRN-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}`;

            // INSIDE processCheckout()

            await JournalEntry.create({
                entryNumber, 
                date: Date.now(), 
                description: `POS Sale - ${orNumber} (${customerName})`, 
                sourceDocument: sale._id,
                division: getDivision(req), // 🛡️ ADD THIS LINE: Prevents GL contamination
                lines: [
                    { account: cashAcc._id, debit: totalAmount, credit: 0, memo: 'POS Receipt' },
                    { account: salesAcc._id, debit: 0, credit: vatableSales, memo: 'POS Sales Revenue' },
                    { account: vatAcc._id, debit: 0, credit: vatAmount, memo: 'Output VAT' },
                    { account: cogsAcc._id, debit: totalCost, credit: 0, memo: 'Cost of Goods Sold' },
                    { account: invAcc._id, debit: 0, credit: totalCost, memo: 'Inventory Reduction' }
                ],
                postedBy: req.user.id
            });
        }
        res.status(201).json({ success: true, message: 'Checkout Complete!', data: sale });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW: Get all sales history for the cashier to view/search
exports.getSalesHistory = async (req, res) => {
    try {
        const sales = await Sale.find().populate('items.product').sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: sales });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW: The Master Refund Engine (BULLETPROOF & AUTH SAFE)
exports.processRefund = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        
        if (!sale) return res.status(404).json({ success: false, message: 'Receipt not found.' });
        if (sale.isRefunded) return res.status(400).json({ success: false, message: 'This receipt has already been refunded.' });
        if (sale.status === 'Unpaid') return res.status(400).json({ success: false, message: 'Cannot refund an unpaid AR debt. Void the invoice instead.' });

        // NEW: PERIOD LOCKING SECURITY CHECK
        const SystemSetting = require('../models/SystemSetting');
        const settings = await SystemSetting.findOne();
        if (settings && settings.lockedDate) {
            if (new Date(sale.createdAt) <= new Date(settings.lockedDate)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Period Closed: You cannot refund a transaction from before ${new Date(settings.lockedDate).toLocaleDateString()}. The accounting period is locked.` 
                });
            }
        }
        // THE FIX: Safely extract the User ID (Mongoose uses _id). 
        // Fallback to the original cashier's ID to satisfy the strict database rules!
        const cashierId = req.user ? (req.user._id || req.user.id) : sale.processedBy;

        // 1. Mark as refunded
        sale.isRefunded = true;
        sale.status = 'Refunded';
        await sale.save();

        // 2. AUTOMATION: Restore Physical Stock
        let totalCOGS = 0;
        for (let item of sale.items) {
            const productInfo = await Product.findById(item.product);
            if (productInfo && productInfo.isPhysical) {
                productInfo.currentStock += item.quantity;
                await productInfo.save();
                
                totalCOGS += (item.quantity * (productInfo.averageCost || 0));

                // INSIDE processRefund()

                await StockMovement.create({
                    product: item.product,
                    warehouse: req.body.warehouseId || null, 
                    type: 'IN',
                    quantity: item.quantity,
                    reference: `Refunded OR: ${sale.orNumber || 'Unknown'}`,
                    processedBy: cashierId,
                    division: getDivision(req) // 🛡️ ADD THIS LINE: Returns stock to the CORRECT tenant
                });
            }
        }

        // Fix floating point math issues
        totalCOGS = Number(totalCOGS.toFixed(2));

        // 3. AUTOMATION: The Reversing Journal Entry
        const cashAccount = await Account.findOne({ name: 'Cash on Hand' });
        const vatAccount = await Account.findOne({ code: '2100' }) || await Account.findOne({ name: 'VAT Payable' });
        const cogsAccount = await Account.findOne({ code: '5000' }) || await Account.findOne({ name: 'Cost of Goods Sold' });
        const inventoryAccount = await Account.findOne({ code: '1500' }) || await Account.findOne({ name: 'Inventory Asset' });
        
        let returnsAccount = await Account.findOne({ code: '4150' }) || await Account.create({ name: 'Sales Returns & Allowances', type: 'Revenue', code: '4150', description: 'Contra-revenue for refunded sales' });

        if (cashAccount && returnsAccount) {
            const entryCount = await JournalEntry.countDocuments();
            const entryNumber = `JRN-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}`;

            const safeVatableSales = sale.vatableSales || sale.totalAmount;
            const safeVatAmount = sale.vatAmount || 0;

            let lines = [
                { account: cashAccount._id, debit: 0, credit: sale.totalAmount, memo: 'Refund given to customer' },
                { account: returnsAccount._id, debit: safeVatableSales, credit: 0, memo: 'Reversing Revenue' }
            ];

            if (safeVatAmount > 0 && vatAccount) {
                lines.push({ account: vatAccount._id, debit: safeVatAmount, credit: 0, memo: 'Reversing Output VAT' });
            }
            
            if (totalCOGS > 0 && cogsAccount && inventoryAccount) {
                lines.push({ account: inventoryAccount._id, debit: totalCOGS, credit: 0, memo: 'Restoring Inventory Asset' });
                lines.push({ account: cogsAccount._id, debit: 0, credit: totalCOGS, memo: 'Reversing COGS Expense' });
            }

            await JournalEntry.create({
                entryNumber, 
                date: Date.now(), 
                description: `POS Sale - ${orNumber} (${customerName})`, 
                sourceDocument: sale._id,
                division: getDivision(req), // 👈 CRITICAL FIX: Lock the ledger to the tenant
                lines: [ /* ... your existing lines ... */ ],
                postedBy: req.user.id
            });
        }

        res.status(200).json({ success: true, message: 'Refund processed perfectly!', data: sale });
    } catch (error) {
        console.error("Refund Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
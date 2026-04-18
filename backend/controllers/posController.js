const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

const { getDivision } = require('../utils/divisionHelper');

exports.processCheckout = async (req, res) => {
    console.log("🚨 POS CONTROLLER HIT! Payload:", req.body);
    // 🛡️ Start an ACID Transaction to prevent Race Conditions
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            // 🛡️ THE FIX: Guarantee a customerName is always set
            const { items, paymentMethod, warehouseId, taxRate = 12, discountAmount = 0 } = req.body;
            const customerName = req.body.customerName || 'Walk-in';
            const targetDivision = getDivision(req);

            // 🛡️ THE FIX: Sanitize the frontend payload! 
            // This strips out 'name' or any other UI-only variables before Mongoose sees it.
            const cleanItems = items.map(item => ({
                product: item.product,
                quantity: Number(item.quantity),
                price: Number(item.price)
            }));
            
            if (!targetDivision) throw new Error("Division ID required");

            const count = await Sale.countDocuments().session(session);
            const receiptNumber = `RCPT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
            const orNumber = `OR-${String(count + 1).padStart(7, '0')}`;

            // 1. DYNAMIC MATH (TAX-EXCLUSIVE + DISCOUNTS)
            const grossSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const netSubtotal = Math.max(0, grossSubtotal - discountAmount); 
            const decimalTax = taxRate / 100;
            const vatAmount = Number((netSubtotal * decimalTax).toFixed(2));
            const finalTotalAmount = Number((netSubtotal + vatAmount).toFixed(2));

            let totalCOGS = 0;
            const stockMovements = [];
            const bulkInventoryUpdates = [];

            // 2. THE ENGINE: COGS Calculation & Atomic Inventory Locks
            for (let item of cleanItems) { // 🛡️ FIX 1: Loop through cleanItems!
                const product = await Product.findById(item.product).session(session);
                if (!product) throw new Error(`Product missing: ${item.product}`);

                // 🌟 FIX 2: CHECK FOR RECIPES FIRST!
                if (product.isPhysical && product.isRecipe && product.ingredients && product.ingredients.length > 0) {
                    for (let ing of product.ingredients) {
                        const rawMaterial = await Product.findById(ing.rawMaterial).session(session);
                        if (!rawMaterial) throw new Error(`Raw material missing for recipe ${product.name}`);

                        // 🧮 UOM MATH: (Recipe Qty * Conversion Factor) * Number of items sold
                        const baseQtyNeeded = ing.quantityNeeded * (ing.conversionToBase || 1);
                        const totalRequiredQty = baseQtyNeeded * item.quantity;

                        if (rawMaterial.currentStock < totalRequiredQty) {
                            throw new Error(`Insufficient raw material (${rawMaterial.name}) to assemble ${product.name}. Need ${totalRequiredQty}, have ${rawMaterial.currentStock}.`);
                        }

                        totalCOGS += (rawMaterial.averageCost || 0) * totalRequiredQty;

                        bulkInventoryUpdates.push({
                            updateOne: {
                                filter: { _id: rawMaterial._id, currentStock: { $gte: totalRequiredQty } }, 
                                update: { $inc: { currentStock: -totalRequiredQty } }
                            }
                        });

                        stockMovements.push({
                            division: targetDivision,
                            product: rawMaterial._id,
                            warehouse: warehouseId,
                            type: 'OUT',
                            quantity: totalRequiredQty,
                            reference: `Assembled for POS Sale: ${orNumber} (${product.name})`,
                            processedBy: req.user?.id || req.user?._id
                        });
                    }
                } 
                // 📦 FIX 3: THEN CHECK STANDARD PHYSICAL GOODS
                else if (product.isPhysical && !product.isRecipe) {
                    if (product.currentStock < item.quantity) {
                        throw new Error(`Insufficient stock for ${product.name}. Only ${product.currentStock} left.`);
                    }
                    totalCOGS += (product.averageCost || 0) * item.quantity;
                    
                    // Queue Atomic Deduction
                    bulkInventoryUpdates.push({
                        updateOne: {
                            filter: { _id: product._id, currentStock: { $gte: item.quantity } }, 
                            update: { $inc: { currentStock: -item.quantity } }
                        }
                    });

                    stockMovements.push({
                        division: targetDivision,
                        product: product._id,
                        warehouse: warehouseId,
                        type: 'OUT',
                        quantity: item.quantity,
                        reference: `POS Sale: ${orNumber}`,
                        processedBy: req.user?.id || req.user?._id
                    });
                }
            }

            totalCOGS = Number(totalCOGS.toFixed(2));

            // 🛡️ THE FIX: Check if the payment method is AR or GCash
            const isReceivable = ['AR', 'GCash', 'Gcash'].includes(paymentMethod);
            const saleStatus = isReceivable ? 'Unpaid' : 'Paid';

            // 3. Execute Bulk Atomic Deductions
            if (bulkInventoryUpdates.length > 0) {
                if (!warehouseId) throw new Error("Warehouse ID is required for physical goods/recipes.");
                const bulkResult = await Product.bulkWrite(bulkInventoryUpdates, { session });
                
                // If modifiedCount doesn't match, someone else bought the last item exactly when we did!
                if (bulkResult.modifiedCount !== bulkInventoryUpdates.length) {
                    throw new Error("Inventory lock failure. Another cashier processed a sale simultaneously. Please try again.");
                }
                await StockMovement.insertMany(stockMovements, { session });
            }

            // 4. CREATE THE SALE RECORD
            const saleRecords = await Sale.create([{
                receiptNumber, 
                orNumber,
                items: cleanItems,
                totalAmount: finalTotalAmount, 
                vatableSales: netSubtotal, 
                vatAmount, 
                discountAmount,
                paymentMethod, 
                customerName, 
                status: saleStatus, 
                balanceDue: saleStatus === 'Unpaid' ? finalTotalAmount : 0, 
                processedBy: req.user.id,
                division: targetDivision 
            }], { session });

            const sale = saleRecords[0];

            // 5. AUTOMATION: Professional Accounting
            // 5. AUTOMATION: Professional Accounting
            // 🛡️ THE FIX: Using the strict schema fields (accountName, accountType, accountCode) so Mongoose doesn't crash!

            let revenueAccount = await Account.findOne({ $or: [{ name: 'Sales Revenue' }, { accountName: 'Sales Revenue' }], division: targetDivision }).session(session) || 
                (await Account.create([{ accountName: 'Sales Revenue', name: 'Sales Revenue', accountType: 'Revenue', type: 'Revenue', accountCode: '4000', code: '4000', division: targetDivision }], { session }))[0];

            let vatAccount = await Account.findOne({ $or: [{ code: '2100' }, { accountCode: '2100' }], division: targetDivision }).session(session) || 
                (await Account.create([{ accountName: 'VAT Payable', name: 'VAT Payable', accountType: 'Liability', type: 'Liability', accountCode: '2100', code: '2100', division: targetDivision }], { session }))[0];

            let cogsAccount = await Account.findOne({ $or: [{ code: '5000' }, { accountCode: '5000' }], division: targetDivision }).session(session) || 
                (await Account.create([{ accountName: 'Cost of Goods Sold', name: 'Cost of Goods Sold', accountType: 'Expense', type: 'Expense', accountCode: '5000', code: '5000', division: targetDivision }], { session }))[0];

            let invAccount = await Account.findOne({ $or: [{ code: '1500' }, { accountCode: '1500' }], division: targetDivision }).session(session) || 
                (await Account.create([{ accountName: 'Inventory Asset', name: 'Inventory Asset', accountType: 'Asset', type: 'Asset', accountCode: '1500', code: '1500', division: targetDivision }], { session }))[0];
            
            let assetAccount;

            // 💳 1. CARD: Goes straight to the vault (Cash in Bank - Code 1010)
            if (paymentMethod === 'Card') {
                assetAccount = await Account.findOne({ $or: [{ code: '1010' }, { accountCode: '1010' }], division: targetDivision }).session(session) || 
                    (await Account.create([{ accountName: 'Cash in Bank', name: 'Cash in Bank', accountType: 'Asset', type: 'Asset', accountCode: '1010', code: '1010', division: targetDivision }], { session }))[0];
            } 
            // 📱 2. AR & GCASH: Goes to Accounts Receivable (Code 1200) until the vendor settles
            else if (paymentMethod === 'AR' || paymentMethod === 'GCash' || paymentMethod === 'Gcash') {
                assetAccount = await Account.findOne({ $or: [{ code: '1200' }, { accountCode: '1200' }], division: targetDivision }).session(session) || 
                    (await Account.create([{ accountName: 'Accounts Receivable', name: 'Accounts Receivable', accountType: 'Asset', type: 'Asset', accountCode: '1200', code: '1200', division: targetDivision }], { session }))[0];
            } 
            // 💵 3. CASH (Default): Stays in the physical drawer (Cash on Hand - Code 1000)
            else {
                assetAccount = await Account.findOne({ $or: [{ code: '1000' }, { accountCode: '1000' }], division: targetDivision }).session(session) || 
                    (await Account.create([{ accountName: 'Cash on Hand', name: 'Cash on Hand', accountType: 'Asset', type: 'Asset', accountCode: '1000', code: '1000', division: targetDivision }], { session }))[0];
            }

            const entryCount = await JournalEntry.countDocuments({ division: targetDivision }).session(session);
            // ... the rest of the code continues normally from here
            const entryNumber = `JRN-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}`;

            let lines = [
                { account: assetAccount._id, debit: finalTotalAmount, credit: 0, memo: 'POS Receipt' },
                { account: revenueAccount._id, debit: 0, credit: netSubtotal, memo: 'POS Sales Revenue' }
            ];

            if (vatAmount > 0) lines.push({ account: vatAccount._id, debit: 0, credit: vatAmount, memo: 'Output VAT' });
            
            if (totalCOGS > 0) {
                lines.push({ account: cogsAccount._id, debit: totalCOGS, credit: 0, memo: 'Cost of Goods Sold' });
                lines.push({ account: invAccount._id, debit: 0, credit: totalCOGS, memo: 'Inventory Reduction' });
            }

            // 👇 ADD THIS TO CALCULATE THE FINANCIAL PERIOD
            const targetDate = Date.now();
            const dDate = new Date(targetDate);
            const periodString = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;

            await JournalEntry.create([{
                entryNumber, 
                documentDate: targetDate, // 🛡️ THE FIX: Added required field
                date: targetDate, 
                period: periodString,     // 🛡️ THE FIX: Added required field
                description: `POS Sale - ${orNumber} (${customerName})`, 
                sourceDocument: sale._id,
                division: targetDivision, 
                lines: lines,
                postedBy: req.user?.id || req.user?._id
            }], { session });

            // Update real-time ledger balances
            assetAccount.currentBalance = (assetAccount.currentBalance || 0) + finalTotalAmount;
            revenueAccount.currentBalance = (revenueAccount.currentBalance || 0) + netSubtotal;
            vatAccount.currentBalance = (vatAccount.currentBalance || 0) + vatAmount;
            
            const saves = [assetAccount.save({ session }), revenueAccount.save({ session }), vatAccount.save({ session })];
            
            if (totalCOGS > 0) {
                cogsAccount.currentBalance = (cogsAccount.currentBalance || 0) + totalCOGS;
                invAccount.currentBalance = (invAccount.currentBalance || 0) - totalCOGS;
                saves.push(cogsAccount.save({ session }), invAccount.save({ session }));
            }
            
            await Promise.all(saves);

            req.completedSale = sale;
        });

        res.status(201).json({ success: true, message: 'Checkout Complete!', data: req.completedSale });
    } catch (error) {
        console.error("🔥 POS Transaction Error:", error);
        res.status(400).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

exports.getSalesHistory = async (req, res) => {
    try {
        const sales = await Sale.find({ division: getDivision(req) }).populate('items.product').sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: sales });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.processRefund = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const sale = await Sale.findById(req.params.id).session(session);
            const targetDivision = getDivision(req);
            
            if (!sale) throw new Error('Receipt not found.');
            if (sale.isRefunded) throw new Error('This receipt has already been refunded.');
            if (sale.status === 'Unpaid') throw new Error('Cannot refund an unpaid AR debt. Void the invoice instead.');

            const SystemSetting = require('../models/SystemSetting');
            const settings = await SystemSetting.findOne().session(session);
            if (settings && settings.lockedDate && new Date(sale.createdAt) <= new Date(settings.lockedDate)) {
                throw new Error(`Period Closed: Cannot refund prior to ${new Date(settings.lockedDate).toLocaleDateString()}.`);
            }

            const cashierId = req.user ? (req.user._id || req.user.id) : sale.processedBy;

            sale.isRefunded = true;
            sale.status = 'Refunded';
            await sale.save({ session });

            let totalCOGS = 0;
            const stockMovements = [];
            const bulkInventoryUpdates = [];

            // 1. AUTOMATION: Restore Physical Stock OR Recipes
            for (let item of sale.items) {
                const product = await Product.findById(item.product).session(session);
                if (!product) continue;

                if (product.isPhysical) {
                    totalCOGS += (product.averageCost || 0) * item.quantity;
                    bulkInventoryUpdates.push({
                        updateOne: { filter: { _id: product._id }, update: { $inc: { currentStock: item.quantity } } }
                    });
                    stockMovements.push({
                        division: targetDivision, product: product._id, warehouse: req.body.warehouseId || null,
                        type: 'IN', quantity: item.quantity, reference: `Refunded OR: ${sale.orNumber}`, processedBy: cashierId
                    });
                } else if (product.isRecipe && product.ingredients) {
                    for (let ing of product.ingredients) {
                        const rawMaterial = await Product.findById(ing.rawMaterial).session(session);
                        if (!rawMaterial) continue;

                        const totalRequiredQty = ing.quantityNeeded * (ing.conversionToBase || 1) * item.quantity;
                        totalCOGS += (rawMaterial.averageCost || 0) * totalRequiredQty;

                        bulkInventoryUpdates.push({
                            updateOne: { filter: { _id: rawMaterial._id }, update: { $inc: { currentStock: totalRequiredQty } } }
                        });
                        stockMovements.push({
                            division: targetDivision, product: rawMaterial._id, warehouse: req.body.warehouseId || null,
                            type: 'IN', quantity: totalRequiredQty, reference: `Refunded Assembled Item: ${sale.orNumber}`, processedBy: cashierId
                        });
                    }
                }
            }

            totalCOGS = Number(totalCOGS.toFixed(2));

            if (bulkInventoryUpdates.length > 0) {
                await Product.bulkWrite(bulkInventoryUpdates, { session });
                await StockMovement.insertMany(stockMovements, { session });
            }

            // 2. AUTOMATION: Reversing Journal Entry
            const cashAccount = await Account.findOne({ name: 'Cash on Hand', division: targetDivision }).session(session);
            const vatAccount = await Account.findOne({ code: '2100', division: targetDivision }).session(session);
            const cogsAccount = await Account.findOne({ code: '5000', division: targetDivision }).session(session);
            const inventoryAccount = await Account.findOne({ code: '1500', division: targetDivision }).session(session);
            let returnsAccount = await Account.findOne({ code: '4150', division: targetDivision }).session(session) || await Account.create([{ name: 'Sales Returns', type: 'Revenue', code: '4150', division: targetDivision }], { session })[0];

            if (cashAccount && returnsAccount) {
                const entryCount = await JournalEntry.countDocuments({ division: targetDivision }).session(session);
                const safeVatableSales = sale.vatableSales || sale.totalAmount;
                const safeVatAmount = sale.vatAmount || 0;

                let lines = [
                    { account: cashAccount._id, debit: 0, credit: sale.totalAmount, memo: 'Refund given to customer' },
                    { account: returnsAccount._id, debit: safeVatableSales, credit: 0, memo: 'Reversing Revenue' }
                ];

                if (safeVatAmount > 0 && vatAccount) lines.push({ account: vatAccount._id, debit: safeVatAmount, credit: 0, memo: 'Reversing Output VAT' });
                
                if (totalCOGS > 0 && cogsAccount && inventoryAccount) {
                    lines.push({ account: inventoryAccount._id, debit: totalCOGS, credit: 0, memo: 'Restoring Inventory Asset' });
                    lines.push({ account: cogsAccount._id, debit: 0, credit: totalCOGS, memo: 'Reversing COGS Expense' });
                }

                await JournalEntry.create([{
                    entryNumber: `JRN-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}`, 
                    date: Date.now(), description: `Refund POS Sale - ${sale.orNumber}`, 
                    sourceDocument: sale._id, division: targetDivision, lines: lines, postedBy: cashierId
                }], { session });
                
                // Reverse Account Balances
                cashAccount.currentBalance = (cashAccount.currentBalance || 0) - sale.totalAmount;
                returnsAccount.currentBalance = (returnsAccount.currentBalance || 0) - safeVatableSales;
                const saves = [cashAccount.save({session}), returnsAccount.save({session})];

                if (safeVatAmount > 0 && vatAccount) { vatAccount.currentBalance -= safeVatAmount; saves.push(vatAccount.save({session})); }
                if (totalCOGS > 0 && cogsAccount && inventoryAccount) {
                    inventoryAccount.currentBalance += totalCOGS;
                    cogsAccount.currentBalance -= totalCOGS;
                    saves.push(inventoryAccount.save({session}), cogsAccount.save({session}));
                }
                await Promise.all(saves);
            }
        });
        res.status(200).json({ success: true, message: 'Refund processed perfectly!' });
    } catch (error) {
        console.error("🔥 Refund Error:", error);
        res.status(400).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};
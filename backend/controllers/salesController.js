const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const Product = require('../models/Product');

exports.createInvoice = async (req, res) => {
    try {
        const { customerName, invoiceDate, description, items, isVatable } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Invoice must contain at least one item." });
        }

        // 1. 🛒 CALCULATE TOTALS, COGS & CHECK STOCK
        let baseAmount = 0; // Total Revenue
        let totalCOGS = 0;  // Total Cost of Goods Sold
        const productsToUpdate = [];

        for (let item of items) {
            // Populate ingredients just in case we are selling a recipe
            const product = await Product.findById(item.productId).populate('ingredients.rawMaterial');
            if (!product) {
                return res.status(404).json({ success: false, message: `Product not found.` });
            }

            // Always add to revenue
            baseAmount += (item.quantity * item.unitPrice);

            // 📦 PHYSICAL GOODS LOGIC (Standard Inventory)
            if (product.isPhysical && !product.isRecipe) {
                if (product.currentStock < item.quantity) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Insufficient stock for ${product.name}. Available: ${product.currentStock}` 
                    });
                }
                totalCOGS += (item.quantity * product.averageCost);
                product.currentStock -= item.quantity;
                productsToUpdate.push(product);
            }
            
            // 🍳 RECIPE / BOM LOGIC (Backflush Costing)
            else if (product.isRecipe) {
                // For recipes, we deduct the raw materials, not the finished product!
                for (let ingredient of product.ingredients) {
                    const rawMaterial = ingredient.rawMaterial;
                    const requiredQty = ingredient.quantityNeeded * item.quantity;
                    
                    if (rawMaterial.currentStock < requiredQty) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `Insufficient raw material (${rawMaterial.name}) to produce ${product.name}.` 
                        });
                    }
                    
                    rawMaterial.currentStock -= requiredQty;
                    // Calculate COGS based on the cost of the raw materials used
                    totalCOGS += (requiredQty * rawMaterial.averageCost);
                    productsToUpdate.push(rawMaterial); 
                }
            }
            
            // 💻 DIGITAL GOODS LOGIC
            // If !isPhysical and !isRecipe, it just passes through. No stock deduction, COGS remains 0.
        }

        // 2. 🇵🇭 CALCULATE TAXES
        let vatAmount = 0;
        let totalReceivable = baseAmount;

        if (isVatable) {
            vatAmount = baseAmount * 0.12; 
            totalReceivable = baseAmount + vatAmount;
        }

        // 3. 🏦 FETCH REQUIRED ACCOUNTS
        const arAccount = await Account.findOne({ $or: [{ accountName: { $regex: /Accounts Receivable/i } }, { name: { $regex: /Accounts Receivable/i } }] });
        const revenueAccount = await Account.findOne({ $or: [{ accountName: { $regex: /Sales|Service Revenue/i } }, { name: { $regex: /Sales|Service Revenue/i } }] });
        const vatAccount = await Account.findOne({ $or: [{ accountName: { $regex: /Output VAT|VAT Payable/i } }, { name: { $regex: /Output VAT|VAT Payable/i } }] });
        
        // We only strictly require COGS and Inventory accounts if we actually sold physical goods
        let cogsAccount, inventoryAccount;
        if (totalCOGS > 0) {
            cogsAccount = await Account.findOne({ $or: [{ accountName: { $regex: /Cost of Goods/i } }, { name: { $regex: /Cost of Goods/i } }, { accountGroup: 'COGS' }] });
            inventoryAccount = await Account.findOne({ $or: [{ accountName: { $regex: /Inventory Asset/i } }, { name: { $regex: /Inventory Asset/i } }] });
            
            if (!cogsAccount || !inventoryAccount) {
                return res.status(400).json({ success: false, message: "Missing COGS or Inventory accounts in the Chart of Accounts." });
            }
        }

        if (!arAccount || !revenueAccount || (isVatable && !vatAccount)) {
            return res.status(400).json({ success: false, message: "Missing AR, Revenue, or VAT accounts in the Chart of Accounts." });
        }

        // 4. 📝 CONSTRUCT THE JOURNAL ENTRY
        const lines = [
            { account: arAccount._id, debit: totalReceivable, credit: 0, memo: `Invoice to ${customerName}` },
            { account: revenueAccount._id, debit: 0, credit: baseAmount, memo: description }
        ];

        // Only add COGS lines if we sold physical inventory
        if (totalCOGS > 0) {
            lines.push(
                { account: cogsAccount._id, debit: totalCOGS, credit: 0, memo: `COGS for ${customerName}` },
                { account: inventoryAccount._id, debit: 0, credit: totalCOGS, memo: 'Inventory Deduction' }
            );
        }

        if (isVatable) {
            lines.push({ account: vatAccount._id, debit: 0, credit: vatAmount, memo: '12% Output VAT' });
        }

        // 📅 5. POST TO THE LEDGER
        const targetDate = new Date(invoiceDate || Date.now());
        const period = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        const entryCount = await JournalEntry.countDocuments({ period });
        const entryNumber = `INV-${period}-${String(entryCount + 1).padStart(4, '0')}`;

        const automatedEntry = await JournalEntry.create({
            entryNumber,
            documentDate: targetDate,
            period,
            description: `Sales Invoice: ${customerName}`,
            sourceDocument: entryNumber,
            lines,
            postedBy: req.user.id || req.user._id
        });

        // 💾 6. SAVE UPDATED INVENTORY (Using Promise.all to handle duplicates safely)
        // Deduplicate in case a recipe uses the same raw material twice, or multiple items hit the same stock
        const uniqueProducts = [...new Map(productsToUpdate.map(item => [item._id.toString(), item])).values()];
        await Promise.all(uniqueProducts.map(p => p.save()));

        // ⚖️ 7. UPDATE RUNNING ACCOUNT BALANCES
        for (let line of lines) {
            const acc = await Account.findById(line.account);
            if (acc) {
                const accType = acc.accountType || acc.type;
                if (['Asset', 'Expense'].includes(accType)) {
                    acc.currentBalance = (acc.currentBalance || 0) + line.debit - line.credit;
                } else {
                    acc.currentBalance = (acc.currentBalance || 0) + line.credit - line.debit;
                }
                await acc.save();
            }
        }

        res.status(201).json({ 
            success: true, 
            message: 'Invoice created successfully.', 
            data: {
                totalBilled: totalReceivable,
                revenue: baseAmount,
                cogsRecognized: totalCOGS,
                grossProfit: baseAmount - totalCOGS,
                vatCollected: vatAmount,
                journalId: automatedEntry._id
            }
        });

    } catch (error) {
        console.error("Sales Invoice Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
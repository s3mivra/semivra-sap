const mongoose = require('mongoose');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const Product = require('../models/Product');

exports.createInvoice = async (req, res) => {
    // 🛡️ 1. START THE ACID TRANSACTION
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { customerName, invoiceDate, description, items, isVatable } = req.body;

        // 🏢 ENTERPRISE FIX: Grab the secure division header!
        const targetDivision = req.headers['x-division-id'] || req.user?.division;
        const divIdString = targetDivision?._id ? targetDivision._id.toString() : targetDivision?.toString();

        if (!divIdString) {
            throw new Error("Division context is missing. Cannot post invoice.");
        }

        if (!items || items.length === 0) {
            throw new Error("Invoice must contain at least one item.");
        }

        // 2. 🛒 CALCULATE TOTALS, COGS & CHECK STOCK
        let baseAmount = 0; 
        let totalCOGS = 0;  
        const productsToUpdate = [];

        for (let item of items) {
            // Note: .session(session) links this read/write to the transaction!
            const product = await Product.findById(item.productId).populate('ingredients.rawMaterial').session(session);
            if (!product) throw new Error(`Product not found.`);

            baseAmount += (item.quantity * item.unitPrice);

            // 📦 PHYSICAL GOODS LOGIC
            if (product.isPhysical && !product.isRecipe) {
                if (product.currentStock < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.currentStock}`);
                }
                totalCOGS += (item.quantity * product.averageCost);
                product.currentStock -= item.quantity;
                productsToUpdate.push(product);
            }
            
            // 🍳 RECIPE / BOM LOGIC (Backflush Costing)
            else if (product.isRecipe) {
                for (let ingredient of product.ingredients) {
                    const rawMaterial = ingredient.rawMaterial;
                    const requiredQty = ingredient.quantityNeeded * item.quantity;
                    
                    if (rawMaterial.currentStock < requiredQty) {
                        throw new Error(`Insufficient raw material (${rawMaterial.name}) to produce ${product.name}.`);
                    }
                    
                    rawMaterial.currentStock -= requiredQty;
                    totalCOGS += (requiredQty * rawMaterial.averageCost);
                    productsToUpdate.push(rawMaterial); 
                }
            }
        }

        // 3. 🇵🇭 CALCULATE TAXES
        let vatAmount = 0;
        let totalReceivable = baseAmount;

        if (isVatable) {
            vatAmount = baseAmount * 0.12; 
            totalReceivable = baseAmount + vatAmount;
        }

        // 4. 🏦 FETCH REQUIRED ACCOUNTS (LOCKED TO DIVISION!)
        const arAccount = await Account.findOne({ division: divIdString, $or: [{ accountName: /Accounts Receivable/i }, { name: /Accounts Receivable/i }] }).session(session);
        const revenueAccount = await Account.findOne({ division: divIdString, $or: [{ accountName: /Sales|Service Revenue/i }, { name: /Sales|Service Revenue/i }] }).session(session);
        const vatAccount = await Account.findOne({ division: divIdString, $or: [{ accountName: /Output VAT|VAT Payable/i }, { name: /Output VAT|VAT Payable/i }] }).session(session);
        
        let cogsAccount, inventoryAccount;
        if (totalCOGS > 0) {
            cogsAccount = await Account.findOne({ division: divIdString, $or: [{ accountName: /Cost of Goods/i }, { name: /Cost of Goods/i }, { accountGroup: 'COGS' }] }).session(session);
            inventoryAccount = await Account.findOne({ division: divIdString, $or: [{ accountName: /Inventory Asset/i }, { name: /Inventory Asset/i }] }).session(session);
            
            if (!cogsAccount || !inventoryAccount) {
                throw new Error("Missing COGS or Inventory accounts in this Division's Chart of Accounts.");
            }
        }

        if (!arAccount || !revenueAccount || (isVatable && !vatAccount)) {
            throw new Error("Missing AR, Revenue, or VAT accounts in this Division's Chart of Accounts.");
        }

        // 5. 📝 CONSTRUCT THE JOURNAL ENTRY LINES
        const lines = [
            { account: arAccount._id, debit: totalReceivable, credit: 0, memo: `Invoice to ${customerName}` },
            { account: revenueAccount._id, debit: 0, credit: baseAmount, memo: description || 'Sales Revenue' }
        ];

        if (totalCOGS > 0) {
            lines.push(
                { account: cogsAccount._id, debit: totalCOGS, credit: 0, memo: `COGS for ${customerName}` },
                { account: inventoryAccount._id, debit: 0, credit: totalCOGS, memo: 'Inventory Deduction' }
            );
        }

        if (isVatable) {
            lines.push({ account: vatAccount._id, debit: 0, credit: vatAmount, memo: '12% Output VAT' });
        }

        // 📅 6. POST TO THE LEDGER
        const targetDate = new Date(invoiceDate || Date.now());
        const period = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Count existing entries in this division for this period to generate the ID
        const entryCount = await JournalEntry.countDocuments({ division: divIdString, period }).session(session);
        const entryNumber = `INV-${period}-${String(entryCount + 1).padStart(4, '0')}`;

        // Note: We use an array payload for .create() when passing a session
        const automatedEntry = await JournalEntry.create([{
            division: divIdString,
            entryNumber,
            documentDate: targetDate,
            postingDate: new Date(), // Always today, even if document is backdated
            period,
            description: `Sales Invoice: ${customerName}`,
            sourceDocument: entryNumber,
            status: 'Posted',
            postedBy: req.user.id || req.user._id,
            lines
        }], { session });

        // 💾 7. SAVE UPDATED INVENTORY 
        const uniqueProducts = [...new Map(productsToUpdate.map(item => [item._id.toString(), item])).values()];
        for (let p of uniqueProducts) {
            await p.save({ session }); // Must use individual saves to pass the session
        }

        // ⚖️ 8. UPDATE RUNNING ACCOUNT BALANCES
        for (let line of lines) {
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

        // ✅ 9. COMMIT TRANSACTION
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ 
            success: true, 
            message: 'Invoice created successfully.', 
            data: {
                totalBilled: totalReceivable,
                revenue: baseAmount,
                cogsRecognized: totalCOGS,
                grossProfit: baseAmount - totalCOGS,
                vatCollected: vatAmount,
                journalId: automatedEntry[0]._id
            }
        });

    } catch (error) {
        // 🛑 THE FAILSAFE: UNDO EVERYTHING
        await session.abortTransaction();
        session.endSession();
        console.error("🔥 Sales Invoice Aborted:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};
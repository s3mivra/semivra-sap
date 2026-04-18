const Unit = require('../models/Unit');
const Warehouse = require('../models/Warehouse');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const { getDivision } = require('../utils/divisionHelper'); // 🛡️ NEW: Import Helper
const mongoose = require('mongoose');

// --- MASTER DATA CRUD ---
exports.createUnit = async (req, res) => {
    try {
        // 🧹 GHOST BUSTER: This forces MongoDB to delete the old global unique rules 
        // and apply our new division-locked rules!
        await Unit.syncIndexes(); 

        const unit = await Unit.create({ ...req.body, division: getDivision(req) }); // 🛡️
        res.status(201).json({ success: true, data: unit });
    } catch (error) { 
        // 🛑 FRIENDLY ERROR INTERCEPTOR
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                error: 'A Unit with this Name or Abbreviation already exists in your division.' 
            });
        }
        res.status(400).json({ success: false, error: error.message }); 
    }
};

exports.getUnits = async (req, res) => {
    try {
        const units = await Unit.find({ isActive: true, division: getDivision(req) }); // 🛡️
        res.status(200).json({ success: true, data: units });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.updateUnit = async (req, res) => {
    try {
        const unit = await Unit.findOneAndUpdate(
            { _id: req.params.id, division: getDivision(req) },
            req.body,
            { new: true, runValidators: true }
        );
        if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
        res.status(200).json({ success: true, data: unit });
    } catch (error) { res.status(400).json({ success: false, error: error.message }); }
};

exports.deleteUnit = async (req, res) => {
    try {
        const targetId = req.params.id;
        const targetDivision = getDivision(req);

        console.log(`\n========================================`);
        console.log(`🗑️ NUCLEAR UNIT DELETE INITIATED`);
        console.log(`Target Unit ID:   ${targetId}`);
        console.log(`Target Division:  ${targetDivision}`);

        // HARD DELETE
        const deletedUnit = await Unit.findOneAndDelete({ 
            _id: targetId, 
            division: targetDivision 
        });

        if (!deletedUnit) {
            console.log(`❌ FAILED: MongoDB could not find Unit ${targetId} in Division ${targetDivision}`);
            console.log(`========================================\n`);
            return res.status(404).json({ success: false, message: 'Unit not found in DB.' });
        }

        console.log(`✅ SUCCESS: "${deletedUnit.name}" has been physically vaporized.`);
        console.log(`========================================\n`);

        res.status(200).json({ success: true, message: 'Unit completely deleted from the database.' });
    } catch (error) { 
        console.log(`🚨 SERVER CRASH:`, error);
        res.status(500).json({ success: false, error: error.message }); 
    }
};

exports.createWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.create({ ...req.body, division: getDivision(req) }); // 🛡️
        res.status(201).json({ success: true, data: warehouse });
    } catch (error) { res.status(400).json({ success: false, error: error.message }); }
};

exports.getWarehouses = async (req, res) => {
    try {
        const warehouses = await Warehouse.find({ isActive: true, division: getDivision(req) }); // 🛡️
        res.status(200).json({ success: true, data: warehouses });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// --- STOCK MOVEMENTS ---
exports.recordMovement = async (req, res) => {
    // 🛡️ Start an ACID Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { product: productId, warehouse, type, quantity, reference } = req.body;
        const targetDivision = getDivision(req);
        
        // Force quantity to be a clean, positive number for our math engine
        const qtyNum = Math.abs(Number(quantity)); 

        // 1. Grab the physical product off the shelf
        const productDoc = await Product.findOne({ _id: productId, division: targetDivision }).session(session);
        if (!productDoc) throw new Error("Product not found or access denied.");

        // 2. Do the real inventory math
        if (type === 'OUT') {
            if (productDoc.currentStock < qtyNum) {
                throw new Error(`Cannot deduct ${qtyNum}. Only ${productDoc.currentStock} in stock.`);
            }
            productDoc.currentStock -= qtyNum; // 📉 Physically remove it!
        } else if (type === 'IN') {
            productDoc.currentStock += qtyNum; // 📈 Physically add it!
        } else {
            throw new Error("Invalid movement type. Must be 'IN' or 'OUT'.");
        }

        // 3. Save the new stock number back to the database
        await productDoc.save({ session });

        // 4. Create the history log
        const movement = await StockMovement.create([{
            division: targetDivision,
            product: productId,
            warehouse,
            type,
            quantity: qtyNum, 
            reference,
            processedBy: req.user?.id || req.user?._id
        }], { session });

        // ✅ If both steps worked perfectly, lock it in!
        await session.commitTransaction();
        res.status(201).json({ success: true, message: 'Stock updated and movement recorded!', data: movement[0] });

    } catch (error) {
        // 🛑 If anything failed, roll back the changes to protect the stock
        await session.abortTransaction();
        res.status(400).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

exports.getStockHistory = async (req, res) => {
    try {
        const history = await StockMovement.find({ division: getDivision(req) }) // 🛡️
            .populate('product', 'name sku')
            .populate('warehouse', 'name code')
            .populate('processedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: history });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.recordProduction = async (req, res) => {
    // 🛡️ Start an ACID Transaction: If we run out of beans halfway through, cancel everything!
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { productId, quantityProduced, warehouseId } = req.body;
        const targetDivision = getDivision(req);

        // 1. Load the Finished Good and its Recipe (Bill of Materials)
        const finishedGood = await Product.findOne({ 
            _id: productId, 
            division: targetDivision 
        }).session(session);

        if (!finishedGood) throw new Error("Product not found.");
        if (!finishedGood.ingredients || finishedGood.ingredients.length === 0) {
            throw new Error("This product does not have a recipe attached to it.");
        }

        // 2. DEDUCT RAW MATERIALS (The Output)
        for (let ingredient of finishedGood.ingredients) {
            const totalRequired = ingredient.quantityNeeded * quantityProduced;
            
            const rawMaterial = await Product.findOne({ 
                _id: ingredient.rawMaterial, 
                division: targetDivision 
            }).session(session);

            // FIREWALL: Do we have enough raw materials in the warehouse?
            if (rawMaterial.currentStock < totalRequired) {
                throw new Error(`Cannot produce! Insufficient stock of ${rawMaterial.name}. You need ${totalRequired} but only have ${rawMaterial.currentStock}.`);
            }

            // Deduct the stock
            rawMaterial.currentStock -= totalRequired;
            await rawMaterial.save({ session });

            // Record the Ledger Movement
            await StockMovement.create([{
                division: targetDivision,
                product: rawMaterial._id,
                warehouse: warehouseId,
                type: 'OUT',
                quantity: totalRequired,
                reference: `Production Run: Used for ${finishedGood.name}`,
                processedBy: req.user.id
            }], { session });
        }

        // 3. ADD FINISHED GOODS (The Input)
        finishedGood.currentStock += quantityProduced;
        await finishedGood.save({ session });

        // Record the Ledger Movement
        await StockMovement.create([{
            division: targetDivision,
            product: finishedGood._id,
            warehouse: warehouseId,
            type: 'IN',
            quantity: quantityProduced,
            reference: `Production Run: Freshly Assembled`,
            processedBy: req.user.id
        }], { session });

        // ✅ 4. COMMIT EVERYTHING
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ 
            success: true, 
            message: `Successfully produced ${quantityProduced} units of ${finishedGood.name}!` 
        });

    } catch (error) {
        // 🛑 If anything failed, undo all database changes
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, error: error.message });
    }
};
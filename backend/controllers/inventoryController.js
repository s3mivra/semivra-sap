const Unit = require('../models/Unit');
const Warehouse = require('../models/Warehouse');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');

// --- MASTER DATA CRUD ---
exports.createUnit = async (req, res) => {
    try {
        const unit = await Unit.create(req.body);
        res.status(201).json({ success: true, data: unit });
    } catch (error) { res.status(400).json({ success: false, error: error.message }); }
};

exports.getUnits = async (req, res) => {
    try {
        const units = await Unit.find({ isActive: true });
        res.status(200).json({ success: true, data: units });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.createWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.create(req.body);
        res.status(201).json({ success: true, data: warehouse });
    } catch (error) { res.status(400).json({ success: false, error: error.message }); }
};

exports.getWarehouses = async (req, res) => {
    try {
        const warehouses = await Warehouse.find({ isActive: true });
        res.status(200).json({ success: true, data: warehouses });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// --- STOCK MOVEMENTS ---
exports.recordMovement = async (req, res) => {
    try {
        const { product, warehouse, type, quantity, reference } = req.body;

        const movement = await StockMovement.create({
            product,
            warehouse,
            type,
            quantity: Math.abs(quantity), // Ensure quantity is recorded as a positive absolute value
            reference,
            processedBy: req.user.id
        });

        res.status(201).json({ success: true, message: 'Stock movement recorded successfully', data: movement });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getStockHistory = async (req, res) => {
    try {
        const history = await StockMovement.find()
            .populate('product', 'name sku')
            .populate('warehouse', 'name code')
            .populate('processedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: history });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};
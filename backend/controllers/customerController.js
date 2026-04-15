const Customer = require('../models/Customer');

// Helper to enforce the division silo
const { getDivision } = require('../utils/divisionHelper');

// 1. Create a New Customer
exports.createCustomer = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        if (!targetDivision) return res.status(400).json({ success: false, message: "Division context is missing." });

        // Auto-generate a customer code if they didn't provide one
        const customerCount = await Customer.countDocuments({ division: targetDivision });
        const autoCode = `CUST-${String(customerCount + 1).padStart(4, '0')}`;

        const newCustomer = await Customer.create({
            ...req.body,
            division: targetDivision,
            customerCode: req.body.customerCode || autoCode
        });

        res.status(201).json({ success: true, data: newCustomer });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: "A customer with this code already exists." });
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get All Customers (Locked to Division)
exports.getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find({ division: getDivision(req) }).sort({ name: 1 });
        res.status(200).json({ success: true, count: customers.length, data: customers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Update a Customer (e.g., Adjusting Credit Limits)
exports.updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findOneAndUpdate(
            { _id: req.params.id, division: getDivision(req) },
            req.body,
            { new: true, runValidators: true }
        );

        if (!customer) return res.status(404).json({ success: false, message: "Customer not found." });
        res.status(200).json({ success: true, data: customer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
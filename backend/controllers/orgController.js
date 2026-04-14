const BusinessUnit = require('../models/BusinessUnit');
const Department = require('../models/Department');
const Role = require('../models/Role');

// ==========================================
// 🏢 BUSINESS UNITS
// ==========================================
exports.getBusinessUnits = async (req, res) => {
    try {
        const units = await BusinessUnit.find().sort({ createdAt: 1 });
        res.status(200).json({ success: true, data: units });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createBusinessUnit = async (req, res) => {
    try {
        const { name, code } = req.body;
        const unit = await BusinessUnit.create({ name, code });
        res.status(201).json({ success: true, data: unit });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==========================================
// 🏬 DEPARTMENTS
// ==========================================
exports.getDepartments = async (req, res) => {
    try {
        // We populate the business unit so the frontend can display the name, not just the ID!
        const departments = await Department.find()
            .populate('businessUnit', 'name code')
            .sort({ createdAt: 1 });
        res.status(200).json({ success: true, data: departments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createDepartment = async (req, res) => {
    try {
        const { name, code, businessUnitId } = req.body;
        const department = await Department.create({ 
            name, 
            code, 
            businessUnit: businessUnitId 
        });
        res.status(201).json({ success: true, data: department });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ==========================================
// 🔐 ROLES & PERMISSIONS
// ==========================================
exports.getRoles = async (req, res) => {
    try {
        // Sort by level descending (Super Admin at the top)
        const roles = await Role.find().sort({ level: -1 });
        res.status(200).json({ success: true, data: roles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createRole = async (req, res) => {
    try {
        const { name, level, permissions } = req.body;
        const role = await Role.create({ name, level, permissions });
        res.status(201).json({ success: true, data: role });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
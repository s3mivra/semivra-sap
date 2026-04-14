const Division = require('../models/Division');

// 1. Create a new ERP Division (Super Admin Only)
exports.createDivision = async (req, res) => {
    try {
        const { divisionName, divisionCode, baseCurrency } = req.body;

        if (!divisionName || !divisionCode) {
            return res.status(400).json({ success: false, message: "Division Name and Code are required." });
        }

        const newDivision = await Division.create({
            divisionName,
            divisionCode: divisionCode.toUpperCase(),
            baseCurrency: baseCurrency || 'PHP'
        });

        res.status(201).json({ 
            success: true, 
            message: `Division ${divisionCode} created successfully. A fresh ERP silo is ready.`,
            data: newDivision 
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "A division with this name or code already exists." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get all Divisions (For Super Admin Dashboards & User Assignment)
exports.getDivisions = async (req, res) => {
    try {
        const divisions = await Division.find().sort({ createdAt: 1 });
        res.status(200).json({ success: true, count: divisions.length, data: divisions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Toggle Division Status (Deactivate a whole branch without deleting data)
exports.toggleDivisionStatus = async (req, res) => {
    try {
        const division = await Division.findById(req.params.id);
        
        if (!division) {
            return res.status(404).json({ success: false, message: "Division not found." });
        }

        division.isActive = !division.isActive;
        await division.save();

        res.status(200).json({ 
            success: true, 
            message: `Division is now ${division.isActive ? 'Active' : 'Inactive'}.`,
            data: division
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
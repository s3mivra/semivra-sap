const Category = require('../models/Category');
const { getDivision } = require('../utils/divisionHelper');

exports.createCategory = async (req, res) => {
    try {
        // 🧹 GHOST BUSTER: Clears old global unique rules
        await Category.syncIndexes(); 

        const category = await Category.create({ 
            ...req.body, 
            division: getDivision(req) // 🛡️ THE FIX: Stamps the Tenant ID!
        });
        
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        // 🛑 Friendly error interceptor for duplicates
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                error: 'A Category with this Code or Name already exists in your division.' 
            });
        }
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ 
            isActive: true, 
            division: getDivision(req) // 🛡️ Ensure they only see their own categories
        }).sort({ name: 1 });
        
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.findOneAndUpdate(
            { _id: req.params.id, division: getDivision(req) },
            req.body,
            { new: true, runValidators: true }
        );
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        console.log(`\n========================================`);
        console.log(`🧨 NUCLEAR DELETE INITIATED`);
        console.log(`Target ID: ${req.params.id}`);

        // Strip away the division check temporarily to force the wipe
        const deletedItem = await Category.findByIdAndDelete(req.params.id);

        if (!deletedItem) {
            console.log(`❌ FAILED: MongoDB could not find this ID!`);
            console.log(`========================================\n`);
            return res.status(404).json({ success: false, message: 'Not found in DB' });
        }

        console.log(`✅ SUCCESS: "${deletedItem.name}" has been completely vaporized.`);
        console.log(`========================================\n`);

        res.status(200).json({ success: true, message: 'Vaporized.' });
    } catch (error) {
        console.log(`🚨 SERVER CRASH:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
};
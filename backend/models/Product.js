const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    // 🛡️ Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    // Universal Fields
    name: { type: String, required: true },
    description: { type: String, required: true },
    sku: { type: String, required: true, uppercase: true }, 
    price: { type: Number, required: true, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    isActive: { type: Boolean, default: true },

    // The Master Switch
    isPhysical: { type: Boolean, default: true }, 
    isRecipe: { type: Boolean, default: false },
    
    // ☕ The Bill of Materials (With Custom UOM Logic)
    ingredients: [{
        rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantityNeeded: { type: Number, required: true, min: 0 },
        
        // 📏 Linked directly to your custom Unit database!
        uom: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
        
        // 🧮 The Math: Translates the recipe unit to the inventory base unit
        conversionToBase: { type: Number, default: 1, min: 0 }
    }],

    // Physical Goods Fields
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }, // The Base Inventory UOM
    currentStock: { type: Number, default: 0, min: 0 }, // Defensive math

    // Inventory Costing Engine
    averageCost: { type: Number, default: 0, min: 0 },

    // Digital Goods Fields
    billingType: { type: String, enum: ['one-time', 'subscription'] },
    durationInDays: { type: Number, min: 1 } 
    
}, { timestamps: true });

// 🛡️ Enforce unique SKUs only within the same division
ProductSchema.index({ division: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', ProductSchema);
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    // Universal Fields (Required for everything)
    name: { type: String, required: true },
    description: { type: String, required: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    isActive: { type: Boolean, default: true },

    // The Master Switch
    isPhysical: { type: Boolean, default: true }, 

    // Physical Goods Fields (NOT strictly required so digital products can save)
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    currentStock: { type: Number, default: 0 }, 

    // NEW: Inventory Costing Engine
    averageCost: { type: Number, default: 0 },

    // Digital Goods Fields (NOT strictly required so physical products can save)
    billingType: { type: String, enum: ['one-time', 'subscription'] },
    durationInDays: { type: Number } 
    
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
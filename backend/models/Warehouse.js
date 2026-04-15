const mongoose = require('mongoose');

const WarehouseSchema = new mongoose.Schema({
    // Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    code: { type: String, required: true, uppercase: true }, // Removed global unique: true
    name: { type: String, required: true },
    location: { type: String }, 
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Enforce unique warehouse codes only within the same division
WarehouseSchema.index({ division: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Warehouse', WarehouseSchema);
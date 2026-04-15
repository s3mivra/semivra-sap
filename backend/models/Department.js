const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    // 🛡️ Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    name: { type: String, required: true }, // e.g., "Inventory Management"
    code: { type: String, required: true }, // e.g., "INV"
    businessUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessUnit', required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// 🛡️ Ensure a department code is unique only within its own Business Unit AND Division
departmentSchema.index({ division: 1, businessUnit: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
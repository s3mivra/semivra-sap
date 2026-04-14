const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Inventory Management"
    code: { type: String, required: true }, // e.g., "INV"
    businessUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessUnit', required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure a department code is unique only within its own Business Unit
departmentSchema.index({ code: 1, businessUnit: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
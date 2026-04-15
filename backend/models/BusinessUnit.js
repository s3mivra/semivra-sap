const mongoose = require('mongoose');

const businessUnitSchema = new mongoose.Schema({
    // 🛡️ Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    name: { type: String, required: true }, // Removed global unique
    code: { type: String, required: true }, // Removed global unique
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// 🛡️ Enforce unique BU names and codes PER DIVISION
businessUnitSchema.index({ division: 1, name: 1 }, { unique: true });
businessUnitSchema.index({ division: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('BusinessUnit', businessUnitSchema);
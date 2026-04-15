const mongoose = require('mongoose');

const UnitSchema = new mongoose.Schema({
    // 🛡️ Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    name: { type: String, required: true }, // Removed global unique
    abbreviation: { type: String, required: true }, // Removed global unique
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// 🛡️ Enforce unique unit names and abbreviations PER DIVISION
UnitSchema.index({ division: 1, name: 1 }, { unique: true });
UnitSchema.index({ division: 1, abbreviation: 1 }, { unique: true });

module.exports = mongoose.model('Unit', UnitSchema);
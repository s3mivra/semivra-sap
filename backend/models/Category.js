const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    // 🛡️ Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    name: { type: String, required: true, trim: true }, // Removed global unique
    code: { type: String, required: true, uppercase: true }, // Removed global unique
    description: { type: String },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// 🛡️ Enforce unique category names and codes PER DIVISION
CategorySchema.index({ division: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', CategorySchema);
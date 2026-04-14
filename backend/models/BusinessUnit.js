const mongoose = require('mongoose');

const businessUnitSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., "Semivra Coffee"
    code: { type: String, required: true, unique: true }, // e.g., "COF"
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('BusinessUnit', businessUnitSchema);
const mongoose = require('mongoose');

const UnitSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., "Piece", "Kilogram", "Box of 12"
    abbreviation: { type: String, required: true, unique: true }, // e.g., "pcs", "kg", "box"
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Unit', UnitSchema);
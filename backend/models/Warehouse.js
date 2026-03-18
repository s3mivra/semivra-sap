const mongoose = require('mongoose');

const WarehouseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true }, // e.g., "MAIN", "STORE-01"
    name: { type: String, required: true }, // e.g., "Main Distribution Center"
    location: { type: String }, // e.g., "New York, NY"
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Warehouse', WarehouseSchema);
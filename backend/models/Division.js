const mongoose = require('mongoose');

const DivisionSchema = new mongoose.Schema({
    divisionName: { type: String, required: true, unique: true },
    divisionCode: { type: String, required: true, unique: true, uppercase: true }, // e.g., 'MNL-HQ' or 'CEBU-WH'
    isActive: { type: Boolean, default: true },
    // Super Admins can configure specific settings per division later
    baseCurrency: { type: String, default: 'PHP' } 
}, { timestamps: true });

module.exports = mongoose.model('Division', DivisionSchema);
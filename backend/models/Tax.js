const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    name: { type: String, required: true }, // e.g., "Standard VAT"
    rate: { type: Number, required: true }, // e.g., 0.12
    type: { type: String, enum: ['Sales', 'Purchasing', 'Payroll', 'Other'], default: 'Sales' },
    accountSystemCode: { type: String }, // Maps to GL account, e.g., 'VAT_PAYABLE'
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure names are unique per division
taxSchema.index({ division: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Tax', taxSchema);
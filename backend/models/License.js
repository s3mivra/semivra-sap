const mongoose = require('mongoose');

const LicenseSchema = new mongoose.Schema({
    licenseKey: { type: String, required: true, unique: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Active', 'Expired', 'Revoked'], default: 'Active' },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('License', LicenseSchema);
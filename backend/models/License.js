const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
    productKey: { type: String, required: true, unique: true }, // XXXX-XXXX-XXXX-XXXX
    businessName: { type: String, required: true },
    machineId: { type: String, default: null }, // The HWID (Fills on first activation)
    status: { 
        type: String, 
        enum: ['Pending', 'Active', 'Suspended', 'Expired'], 
        default: 'Pending' 
    },
    usageCount: { type: Number, default: 0 }, // 0 = New, 1 = Bound to a PC
    expiresAt: { type: Date, required: true },
    activatedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('License', licenseSchema);
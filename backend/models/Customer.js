const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    // 🏢 The Data Silo Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    // 🪪 Core Identification
    customerCode: { type: String, required: true }, // e.g., CUST-1001
    name: { type: String, required: true },
    contactPerson: { type: String },
    
    // 📞 Contact Info
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    taxId: { type: String }, // TIN Number
    
    // 💰 Financial Controls (Enterprise Features)
    creditLimit: { type: Number, default: 0 }, // 0 = Cash only, no terms allowed
    currentBalance: { type: Number, default: 0 }, // Live AR balance
    paymentTerms: { type: String, enum: ['Cash', 'Net 15', 'Net 30', 'Net 60'], default: 'Cash' },
    
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure customer codes are unique ONLY within their specific division
CustomerSchema.index({ division: 1, customerCode: 1 }, { unique: true });

module.exports = mongoose.model('Customer', CustomerSchema);
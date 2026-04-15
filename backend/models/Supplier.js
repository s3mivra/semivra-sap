const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
    // Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    name: { type: String, required: true },
    contactName: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    isActive: { type: Boolean, default: true },
    
    // The Vendor Catalog
    catalog: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        defaultCost: { type: Number, required: true }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Supplier', SupplierSchema);
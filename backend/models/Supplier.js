const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contactName: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    isActive: { type: Boolean, default: true },
    
    // NEW: The Vendor Catalog (Links products to this supplier with a default cost)
    catalog: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        defaultCost: { type: Number, required: true }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Supplier', SupplierSchema);
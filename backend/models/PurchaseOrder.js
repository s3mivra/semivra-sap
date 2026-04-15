const mongoose = require('mongoose');

const PurchaseOrderSchema = new mongoose.Schema({
    // Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    poNumber: { type: String, required: true }, // Removed global unique: true
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        unitCost: { type: Number, required: true }
    }],
    
    totalAmount: { type: Number, required: true },
    
    status: { 
        type: String, 
        enum: ['Draft', 'Ordered', 'Received', 'Cancelled', 'Paid'], 
        default: 'Ordered' 
    },
    
    receivedAt: { type: Date },
    receivingWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    paymentMethod: { type: String, enum: ['Cash', 'Terms'], default: 'Cash' },
    balance: { type: Number },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Enforce unique PO Numbers only within the same division
PurchaseOrderSchema.index({ division: 1, poNumber: 1 }, { unique: true });

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
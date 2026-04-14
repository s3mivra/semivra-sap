const mongoose = require('mongoose');

const PurchaseOrderSchema = new mongoose.Schema({
    poNumber: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    
    // The items we are ordering
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        unitCost: { type: Number, required: true } // What the supplier charges us
    }],
    
    totalAmount: { type: Number, required: true },
    
    status: { 
        type: String, 
        enum: ['Draft', 'Ordered', 'Received', 'Cancelled', 'Paid'], 
        default: 'Ordered' 
    },
    
    // When the truck actually arrives
    receivedAt: { type: Date },
    receivingWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    paymentMethod: { type: String, enum: ['Cash', 'Terms'], default: 'Cash' },
    balance: { type: Number },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
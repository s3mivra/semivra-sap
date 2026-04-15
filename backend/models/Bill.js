const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    // 🛡️ Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    
    // Defensive Math applied
    amount: { type: Number, required: true, min: 0 },
    balanceDue: { type: Number, required: true, min: 0 }, // Decreases as payments are made
    
    status: { 
        type: String, 
        enum: ['Unpaid', 'Partial', 'Paid', 'Overdue'], 
        default: 'Unpaid' 
    },
    
    dueDate: { type: Date, required: true },
    description: { type: String },
    
    // Array to track individual payments made against this bill
    payments: [{
        amount: { type: Number, required: true, min: 0 },
        date: { type: Date, default: Date.now },
        paymentMethod: { type: String },
        referenceId: { type: String } // e.g., Check Number or Bank Txn ID
    }]
}, { timestamps: true });

// 🚀 Fast lookup index for Accounts Payable dashboards
billSchema.index({ division: 1, supplier: 1, status: 1 });

module.exports = mongoose.model('Bill', billSchema);
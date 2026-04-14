// models/Bill.js
const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    
    amount: { type: Number, required: true },
    balanceDue: { type: Number, required: true }, // Decreases as payments are made
    
    status: { 
        type: String, 
        enum: ['Unpaid', 'Partial', 'Paid', 'Overdue'], 
        default: 'Unpaid' 
    },
    
    dueDate: { type: Date, required: true },
    description: { type: String },
    
    // Array to track individual payments made against this bill
    payments: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        paymentMethod: { type: String },
        referenceId: { type: String } // e.g., Check Number or Bank Txn ID
    }]
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
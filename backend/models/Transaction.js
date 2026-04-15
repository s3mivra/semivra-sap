const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    license: { type: mongoose.Schema.Types.ObjectId, ref: 'License' }, // Linked after successful payment
    
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    
    status: { 
        type: String, 
        enum: ['Pending', 'Completed', 'Failed', 'Refunded'], 
        default: 'Pending' 
    },
    paymentMethod: { type: String, required: true }, // e.g., 'Stripe', 'PayPal', 'Manual'
    paymentReference: { type: String }, // The ID from the payment gateway
    
    notes: { type: String }
}, { timestamps: true });

TransactionSchema.index({ division: 1, user: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
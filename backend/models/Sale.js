const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    // Standardized numbering
    receiptNumber: { type: String, required: true, unique: true }, // Internal System ID
    orNumber: { type: String, unique: true, sparse: true }, // Official Receipt Number (for BIR)
    invoiceNumber: { type: String, unique: true, sparse: true }, // For B2B Sales / AR

    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    
    // The Financial & Tax Breakdown
    // The Financial & Tax Breakdown
    totalAmount: { type: Number, required: true },
    vatableSales: { type: Number, required: true },
    vatAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    
    // NEW: Debt Tracking
    balanceDue: { type: Number, required: true, default: 0 }, // How much is left to pay
    payments: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        method: { type: String, enum: ['Cash', 'Card', 'GCash', 'Bank Transfer'], required: true },
        reference: { type: String } // e.g., Check number or GCash Ref
    }],
    vatExemptSales: { type: Number, default: 0 }, 
    
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'GCash', 'AR', 'Other'], default: 'Cash' },
    
    // NEW: Universal POS tracking
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    status: { type: String, enum: ['Paid', 'Unpaid', 'Refunded'], default: 'Paid' },
    
    // NEW: Refund Tracking
    isRefunded: { type: Boolean, default: false },

    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);
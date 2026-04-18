const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    // Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    // Standardized numbering (Removed global unique: true from all three)
    receiptNumber: { type: String, required: true }, 
    orNumber: { type: String, sparse: true }, 
    invoiceNumber: { type: String, sparse: true }, 

    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    
    // The Financial & Tax Breakdown
    totalAmount: { type: Number, required: true },
    vatableSales: { type: Number, required: true },
    vatAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    
    // Debt Tracking
    balanceDue: { type: Number, required: true, default: 0 }, 
    payments: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        method: { type: String, enum: ['Cash', 'Card', 'GCash', 'Bank Transfer'], required: true },
        reference: { type: String } 
    }],
    vatExemptSales: { type: Number, default: 0 }, 
    
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'GCash', 'AR', 'Other'], default: 'Cash' },
    
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    status: { type: String, enum: ['Paid', 'Unpaid', 'Refunded'], default: 'Paid' },
    
    isRefunded: { type: Boolean, default: false },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Multi-tenant unique indexes
SaleSchema.index({ division: 1, receiptNumber: 1 }, { unique: true });
SaleSchema.index({ division: 1, orNumber: 1 }, { unique: true, sparse: true });
// 🛡️ THE FIX: Only enforce uniqueness if the invoiceNumber actually exists as a string!
SaleSchema.index(
    { division: 1, invoiceNumber: 1 }, 
    { unique: true, partialFilterExpression: { invoiceNumber: { $type: "string" } } }
);

module.exports = mongoose.model('Sale', SaleSchema);
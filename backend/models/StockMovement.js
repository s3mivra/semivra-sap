const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema({
    // Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    
    type: { 
        type: String, 
        enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'], 
        required: true 
    },
    
    quantity: { type: Number, required: true }, 
    reference: { type: String, required: true }, 
    
    date: { type: Date, default: Date.now },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('StockMovement', StockMovementSchema);
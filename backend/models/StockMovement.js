const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema({
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

// 🔥 THE GHOST HAS BEEN DELETED 🔥
// All inventory math is now strictly controlled by the backend controllers 
// (e.g., posController.js, purchasingController.js) to prevent double-counting.

module.exports = mongoose.model('StockMovement', StockMovementSchema);
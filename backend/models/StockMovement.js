const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    
    type: { 
        type: String, 
        enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'], 
        required: true 
    },
    
    quantity: { type: Number, required: true }, // Always positive. We use 'type' to know if it's adding or subtracting.
    
    // The reason for the movement (e.g., "Purchase Order 123", "Sale to Customer X", "Broken in transit")
    reference: { type: String, required: true }, 
    
    date: { type: Date, default: Date.now },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Pre-save hook to update the cached 'currentStock' on the Product automatically!
// Modern Mongoose hook (NO 'next' callback!)
StockMovementSchema.pre('save', async function() {
    const Product = mongoose.model('Product');
    
    // Determine if we are adding or subtracting stock
    let stockChange = 0;
    if (this.type === 'IN' || (this.type === 'ADJUSTMENT' && this.quantity > 0)) {
        stockChange = this.quantity;
    } else if (this.type === 'OUT') {
        stockChange = -this.quantity;
    }

    // Update the product's total stock count
    await Product.findByIdAndUpdate(this.product, {
        $inc: { currentStock: stockChange }
    });
});

module.exports = mongoose.model('StockMovement', StockMovementSchema);
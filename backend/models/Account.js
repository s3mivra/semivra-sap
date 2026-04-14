const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    // 👇 FIX: Removed 'unique: true' from here! It is now handled at the bottom.
    accountCode: { type: String, required: true }, 
    
    code: { type: String }, 
    name: { type: String },

    accountName: { type: String, required: true }, 
    accountType: { 
        type: String, 
        enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'], 
        required: true 
    },
    accountGroup: { type: String }, 
    
    parentAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null }, 
    
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    
    isActive: { type: Boolean, default: true } 
}, { timestamps: true });

// 🏢 THE MULTI-TENANT LOCK: "1010" is only unique WITHIN a specific division!
accountSchema.index({ division: 1, accountCode: 1 }, { unique: true });

module.exports = mongoose.model('Account', accountSchema);
const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // e.g., 1000, 2000, 4000
    name: { type: String, required: true }, // e.g., "Cash", "Accounts Receivable", "Sales Revenue"
    type: { 
        type: String, 
        enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'], 
        required: true 
    },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    isSystemAccount: { type: Boolean, default: false } // Prevents deletion of core accounts
}, { timestamps: true });

module.exports = mongoose.model('Account', AccountSchema);
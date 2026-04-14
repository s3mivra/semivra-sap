const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true 
    },
    level: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 100 
    },
    permissions: [{
        type: String,
        // 👇 THE FIX: Make sure this enum EXACTLY matches the React frontend! 👇
        enum: [
            'View Reports', 
            'Manage Inventory', 
            'Process Sales', 
            'Approve POs', 
            'Manage Ledger', 
            'Configure Taxes'
        ]
    }]
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);
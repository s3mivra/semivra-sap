// Inside models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // 👇 THE NEW ADVANCED ACCESS CONTROL 👇
    // Add this inside your UserSchema
    // ✅ THE NEW ENTERPRISE WAY
role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    
    // 👇 NEW: Lock the user into a specific data silo
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: false},
    // 👆 ========================================= 👆
    
    // 👇 NEW: Payroll & Compensation Data 👇
    compensation: {
        payType: { type: String, enum: ['Salary', 'Hourly'], default: 'Salary' },
        baseRate: { type: Number, default: 0 }, // Annual salary OR hourly rate
        taxRate: { type: Number, default: 0.20 } // e.g., 20% standard deduction
    },
    // ----------------------------------------
    businessUnit: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'BusinessUnit',
        default: null // Super Admins might not belong to just one!
    },
    department: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Department',
        default: null
    },
    
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
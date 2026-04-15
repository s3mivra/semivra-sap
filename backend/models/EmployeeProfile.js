const mongoose = require('mongoose');

const employeeProfileSchema = new mongoose.Schema({
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true }, // Tenant Lock
    userAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional link to app login
    employeeId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    
    // Compensation Engine
    compensationType: { type: String, enum: ['Salary', 'Hourly'], required: true },
    baseRate: { type: Number, required: true, min: 0 }, // Hourly rate OR Annual Salary
    
    // Tax & Bank Info
    taxId: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Enforce unique Employee IDs per division
employeeProfileSchema.index({ division: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeProfile', employeeProfileSchema);
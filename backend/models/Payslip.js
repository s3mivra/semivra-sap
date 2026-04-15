const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
    // 🛡️ Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    payrollRun: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // The Math (Strictly positive numbers)
    hoursWorked: { type: Number, default: 0, min: 0 }, // For hourly employees
    grossPay: { type: Number, required: true, min: 0 },
    taxDeduction: { type: Number, default: 0, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' }
}, { timestamps: true });

// An employee can only have one payslip per payroll run
payslipSchema.index({ division: 1, payrollRun: 1, employee: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);
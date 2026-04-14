const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
    payrollRun: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // The Math
    hoursWorked: { type: Number, default: 0 }, // For hourly employees
    grossPay: { type: Number, required: true },
    taxDeduction: { type: Number, default: 0 },
    netPay: { type: Number, required: true },
    
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Payslip', payslipSchema);
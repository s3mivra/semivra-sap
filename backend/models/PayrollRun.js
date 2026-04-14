const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema({
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    processDate: { type: Date, default: Date.now },
    
    // Draft = Calculating, Approved = Ready to pay, Paid = Money has left the bank
    status: { type: String, enum: ['Draft', 'Approved', 'Paid'], default: 'Draft' },
    
    // Batch Totals
    totalGrossPay: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalNetPay: { type: Number, default: 0 },
    
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
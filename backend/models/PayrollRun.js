const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema({
    // 🛡️ Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    processDate: { type: Date, default: Date.now },
    
    // Draft = Calculating, Approved = Ready to pay, Paid = Money has left the bank
    status: { type: String, enum: ['Draft', 'Approved', 'Paid'], default: 'Draft' },
    
    // Batch Totals with Defensive Math (Cannot be negative)
    totalGrossPay: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    totalNetPay: { type: Number, default: 0, min: 0 },
    
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Prevent duplicate overlapping payroll runs within the same division
payrollRunSchema.index({ division: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
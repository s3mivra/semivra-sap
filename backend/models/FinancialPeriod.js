const mongoose = require('mongoose');

const FinancialPeriodSchema = new mongoose.Schema({
    // 🏢 The Data Silo Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    
    // 📅 The specific month being tracked (Format: YYYY-MM)
    periodCode: { type: String, required: true },
    
    // 🔒 The Vault Status
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    
    // 🕵️ Audit Trail (Who locked the vault and when)
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closedAt: { type: Date }

}, { timestamps: true });

// A division can only have one status record per month
FinancialPeriodSchema.index({ division: 1, periodCode: 1 }, { unique: true });

module.exports = mongoose.model('FinancialPeriod', FinancialPeriodSchema);
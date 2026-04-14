const mongoose = require('mongoose');

// A sub-schema for the individual lines of a journal entry
const JournalLineSchema = new mongoose.Schema({
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    memo: { type: String },
    // 🏢 NEW: The bridge to AR/AP Subsidiary Ledgers (Customers/Suppliers)
    subsidiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    
    // 🔍 NEW: Bank Reconciliation Tracking
    isReconciled: { type: Boolean, default: false },
    reconciledAt: { type: Date }
});

const JournalEntrySchema = new mongoose.Schema({
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },
    entryNumber: { type: String, required: true, unique: true }, // e.g., JRN-2026-04-0001
    
    // 📅 NEW: Date Separation 
    documentDate: { type: Date, required: true }, // When the actual invoice/receipt happened
    postingDate: { type: Date, default: Date.now }, // When the accountant typed it into the system
    period: { type: String, required: true }, // Format: "YYYY-MM" (e.g., "2026-04") for fast P&L queries
    
    description: { type: String, required: true },
    sourceDocument: { type: String }, // Reference to a Sale, Purchase Order, or Payroll Run
    
    // 🚦 NEW: Status tracking
    status: { type: String, enum: ['Draft', 'Posted', 'Voided', 'Closed'], default: 'Posted' },
    
    // 🛡️ NEW: Audit Trail fields for Voiding
    voidReason: { type: String },
    voidedAt: { type: Date },
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    lines: [JournalLineSchema],
    
    totalDebit: { type: Number, required: true, min: 0 },
    totalCredit: { type: Number, required: true, min: 0 },
    
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Modern Mongoose hook: Ensures fundamental law of accounting
JournalEntrySchema.pre('validate', function() {
    // Calculate precision to avoid JavaScript floating point errors
    const debitSum = this.lines.reduce((acc, line) => acc + (line.debit || 0), 0);
    const creditSum = this.lines.reduce((acc, line) => acc + (line.credit || 0), 0);
    
    this.totalDebit = Math.round(debitSum * 100) / 100;
    this.totalCredit = Math.round(creditSum * 100) / 100;

    // If it doesn't balance, throw the error directly
    if (this.totalDebit !== this.totalCredit) {
        throw new Error(`Journal Entry is unbalanced! Debits: ${this.totalDebit}, Credits: ${this.totalCredit}`);
    }
});

module.exports = mongoose.model('JournalEntry', JournalEntrySchema);
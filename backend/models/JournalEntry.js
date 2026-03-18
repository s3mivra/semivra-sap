const mongoose = require('mongoose');

// A sub-schema for the individual lines of a journal entry
const JournalLineSchema = new mongoose.Schema({
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    memo: { type: String }
});

const JournalEntrySchema = new mongoose.Schema({
    entryNumber: { type: String, required: true, unique: true }, // e.g., JRN-2023-0001
    date: { type: Date, default: Date.now, required: true },
    description: { type: String, required: true },
    
    // Reference to other modules (e.g., the ID of a Sale, Purchase Order, or manual entry)
    sourceDocument: { type: String }, 
    
    lines: [JournalLineSchema],
    
    totalDebit: { type: Number, required: true, min: 0 },
    totalCredit: { type: Number, required: true, min: 0 },
    
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Pre-save hook to ensure the fundamental law of accounting: Debits MUST equal Credits
// Modern Mongoose hook (No 'next' callback needed!)
JournalEntrySchema.pre('validate', function() {
    // Calculate precision to avoid JavaScript floating point errors
    const debitSum = this.lines.reduce((acc, line) => acc + (line.debit || 0), 0);
    const creditSum = this.lines.reduce((acc, line) => acc + (line.credit || 0), 0);
    
    this.totalDebit = Math.round(debitSum * 100) / 100;
    this.totalCredit = Math.round(creditSum * 100) / 100;

    // If it doesn't balance, we simply throw the error directly!
    if (this.totalDebit !== this.totalCredit) {
        throw new Error(`Journal Entry is unbalanced! Debits: ${this.totalDebit}, Credits: ${this.totalCredit}`);
    }
});

module.exports = mongoose.model('JournalEntry', JournalEntrySchema);
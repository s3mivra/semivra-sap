const mongoose = require('mongoose');

const FixedAssetSchema = new mongoose.Schema({
    // 🛡️ Tenant Lock
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', required: true },

    assetCode: { type: String, required: true }, // Removed global unique
    assetName: { type: String, required: true },
    description: { type: String },
    serialNumber: { type: String },
    
    // 💰 Valuation (With Defensive Math Constraints)
    purchaseDate: { type: Date, required: true },
    purchaseCost: { type: Number, required: true, min: 0 },
    salvageValue: { type: Number, default: 0, min: 0 }, // What it's worth at the end of its life
    usefulLifeMonths: { type: Number, required: true, min: 1 }, // e.g., 36 months for a laptop
    
    // 📉 Depreciation Tracking
    accumulatedDepreciation: { type: Number, default: 0, min: 0 },
    currentBookValue: { type: Number, required: true, min: 0 },
    lastDepreciationDate: { type: Date },
    status: { type: String, enum: ['Active', 'Fully Depreciated', 'Disposed'], default: 'Active' },
    
    // 🏦 Ledger Links (Where does the math go?)
    assetAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    expenseAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    accumulatedDepreciationAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// 🛡️ Enforce unique Asset Codes only within the same division
FixedAssetSchema.index({ division: 1, assetCode: 1 }, { unique: true });

// Virtual for Net Book Value (What it's currently worth on the balance sheet)
FixedAssetSchema.virtual('netBookValue').get(function() {
    return this.purchaseCost - this.accumulatedDepreciation;
});

FixedAssetSchema.set('toJSON', { virtuals: true });
FixedAssetSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FixedAsset', FixedAssetSchema);
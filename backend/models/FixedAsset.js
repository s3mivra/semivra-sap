const mongoose = require('mongoose');

const FixedAssetSchema = new mongoose.Schema({
    assetCode: { type: String, required: true, unique: true },
    assetName: { type: String, required: true },
    description: { type: String },
    serialNumber: { type: String },
    
    // 💰 Valuation
    purchaseDate: { type: Date, required: true },
    purchaseCost: { type: Number, required: true },
    salvageValue: { type: Number, default: 0 }, // What it's worth at the end of its life
    usefulLifeMonths: { type: Number, required: true }, // e.g., 36 months for a laptop
    
    // 📉 Depreciation Tracking
    accumulatedDepreciation: { type: Number, default: 0 },
    lastDepreciationDate: { type: Date },
    status: { type: String, enum: ['Active', 'Fully Depreciated', 'Disposed'], default: 'Active' },
    
    // 🏦 Ledger Links (Where does the math go?)
    assetAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    expenseAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    accumulatedDepreciationAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true }
}, { timestamps: true });

// Virtual for Net Book Value (What it's currently worth on the balance sheet)
FixedAssetSchema.virtual('netBookValue').get(function() {
    return this.purchaseCost - this.accumulatedDepreciation;
});

FixedAssetSchema.set('toJSON', { virtuals: true });
FixedAssetSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FixedAsset', FixedAssetSchema);
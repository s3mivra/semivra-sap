const FixedAsset = require('../models/FixedAsset');
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

// 1. Get all assets
exports.getAssets = async (req, res) => {
    try {
        const assets = await FixedAsset.find().populate('assetAccount expenseAccount accumulatedDepreciationAccount', 'accountName accountCode');
        res.status(200).json({ success: true, data: assets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Register a new asset
exports.registerAsset = async (req, res) => {
    try {
        const assetCount = await FixedAsset.countDocuments();
        const assetCode = `FA-${String(assetCount + 1).padStart(4, '0')}`;
        
        const newAsset = await FixedAsset.create({
            ...req.body,
            assetCode
        });

        res.status(201).json({ success: true, data: newAsset });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 3. The Core Depreciation Engine (Runs at the end of every month)
exports.runMonthlyDepreciation = async (req, res) => {
    try {
        const targetDate = new Date();
        const period = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

        // Find assets that still have value to lose
        const activeAssets = await FixedAsset.find({ status: 'Active' });
        let totalDepreciationPosted = 0;
        let entriesCreated = 0;

        for (let asset of activeAssets) {
            // Straight-Line Formula: (Cost - Salvage) / Useful Life
            const monthlyDepreciation = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeMonths;
            
            // Check if adding this month goes over the limit
            let depreciationToPost = monthlyDepreciation;
            if (asset.accumulatedDepreciation + monthlyDepreciation >= (asset.purchaseCost - asset.salvageValue)) {
                depreciationToPost = (asset.purchaseCost - asset.salvageValue) - asset.accumulatedDepreciation;
                asset.status = 'Fully Depreciated';
            }

            if (depreciationToPost <= 0) continue;

            // 📝 Construct the Journal Entry for this specific asset
            const lines = [
                { account: asset.expenseAccount, debit: depreciationToPost, credit: 0, memo: `Monthly Dep. for ${asset.assetCode}` },
                { account: asset.accumulatedDepreciationAccount, debit: 0, credit: depreciationToPost, memo: `Acc. Dep. for ${asset.assetCode}` }
            ];

            const entryCount = await JournalEntry.countDocuments({ period });
            const entryNumber = `DEP-${period}-${String(entryCount + 1).padStart(4, '0')}`;

            await JournalEntry.create({
                entryNumber,
                documentDate: targetDate,
                period,
                description: `Monthly Depreciation: ${asset.assetName}`,
                sourceDocument: asset.assetCode,
                lines,
                postedBy: req.user.id || req.user._id
            });

            // Update Account Balances
            await Account.findByIdAndUpdate(asset.expenseAccount, { $inc: { currentBalance: depreciationToPost } });
            await Account.findByIdAndUpdate(asset.accumulatedDepreciationAccount, { $inc: { currentBalance: depreciationToPost } });

            // Update Asset Record
            asset.accumulatedDepreciation += depreciationToPost;
            asset.lastDepreciationDate = targetDate;
            await asset.save();

            totalDepreciationPosted += depreciationToPost;
            entriesCreated++;
        }

        res.status(200).json({ 
            success: true, 
            message: `Successfully posted ${entriesCreated} depreciation entries.`,
            totalDepreciated: totalDepreciationPosted
        });

    } catch (error) {
        console.error("Depreciation Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
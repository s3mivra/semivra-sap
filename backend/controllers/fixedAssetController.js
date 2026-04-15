const mongoose = require('mongoose');
const FixedAsset = require('../models/FixedAsset'); 
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');
const { getDivision } = require('../utils/divisionHelper'); // 🛡️ Centralized tenant helper

// @desc    Register a new Fixed Asset
exports.registerAsset = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        if (!targetDivision) return res.status(400).json({ success: false, message: 'Division ID required' });

        const { assetCode, assetName, description, purchaseDate, purchaseCost, salvageValue, usefulLifeMonths, assetAccount, expenseAccount, accumulatedDepreciationAccount } = req.body;

        const asset = await FixedAsset.create({
            division: targetDivision, // 🛡️ Scope to tenant
            assetCode,
            assetName,
            description,
            purchaseDate,
            purchaseCost,
            salvageValue,
            usefulLifeMonths,
            currentBookValue: purchaseCost, // Initial book value is the purchase cost
            accumulatedDepreciation: 0,
            status: 'Active',
            assetAccount,
            expenseAccount,
            accumulatedDepreciationAccount,
            registeredBy: req.user.id
        });

        res.status(201).json({ success: true, data: asset });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get all assets for the division
exports.getAssets = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        // 🛡️ Scope query to tenant
        const assets = await FixedAsset.find({ division: targetDivision }).sort({ purchaseDate: -1 });
        res.status(200).json({ success: true, data: assets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Run Monthly Depreciation (ACID Transaction)
exports.runDepreciation = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const targetDivision = getDivision(req);
            const { period } = req.body; // e.g., '2026-04'

            if (!targetDivision) throw new Error("Division ID required.");

            // 1. Find all active assets scoped to this tenant
            const assets = await FixedAsset.find({ 
                division: targetDivision, 
                status: 'Active',
                currentBookValue: { $gt: 0 } 
            }).session(session);

            if (assets.length === 0) throw new Error("No active assets require depreciation.");

            let totalDepreciationExpense = 0;
            const assetUpdates = [];

            // 2. Calculate Straight-Line Depreciation
            for (const asset of assets) {
                if (asset.currentBookValue <= asset.salvageValue) {
                    asset.status = 'Fully Depreciated';
                    assetUpdates.push(asset.save({ session }));
                    continue;
                }

                // Straight Line Math: (Cost - Salvage) / Useful Life
                const monthlyDepreciation = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeMonths;
                
                // Ensure we don't depreciate past the salvage value
                const actualDepreciation = Math.min(monthlyDepreciation, asset.currentBookValue - asset.salvageValue);

                asset.accumulatedDepreciation += actualDepreciation;
                asset.currentBookValue -= actualDepreciation;
                asset.lastDepreciationDate = Date.now();
                
                if (asset.currentBookValue <= asset.salvageValue) {
                    asset.status = 'Fully Depreciated';
                }

                totalDepreciationExpense += actualDepreciation;
                assetUpdates.push(asset.save({ session }));
            }

            if (totalDepreciationExpense === 0) throw new Error("No depreciation to post this month.");

            // 3. Post the Journal Entry
            let expenseAcc = await Account.findOne({ name: 'Depreciation Expense', division: targetDivision }).session(session);
            if (!expenseAcc) expenseAcc = (await Account.create([{ name: 'Depreciation Expense', type: 'Expense', code: '6100', division: targetDivision }], { session }))[0];
                
            let accumDeprAcc = await Account.findOne({ name: 'Accumulated Depreciation', division: targetDivision }).session(session);
            if (!accumDeprAcc) accumDeprAcc = (await Account.create([{ name: 'Accumulated Depreciation', type: 'Asset', code: '1501', isContra: true, division: targetDivision }], { session }))[0];

            const entryCount = await JournalEntry.countDocuments({ period, division: targetDivision }).session(session);
            
            await JournalEntry.create([{
                division: targetDivision,
                period,
                entryNumber: `DEP-${period}-${String(entryCount + 1).padStart(4, '0')}`,
                date: Date.now(),
                documentDate: Date.now(),
                postingDate: Date.now(),
                description: `Monthly Fixed Asset Depreciation for ${period}`,
                lines: [
                    { account: expenseAcc._id, debit: Number(totalDepreciationExpense.toFixed(2)), credit: 0, memo: 'Depreciation Expense' },
                    { account: accumDeprAcc._id, debit: 0, credit: Number(totalDepreciationExpense.toFixed(2)), memo: 'Accumulated Depreciation' }
                ],
                postedBy: req.user.id
            }], { session });

            // 4. Update Account Balances
            expenseAcc.currentBalance = (expenseAcc.currentBalance || 0) + totalDepreciationExpense;
            // Accumulated Depreciation is a Contra-Asset, so a credit INCREASES its absolute balance
            accumDeprAcc.currentBalance = (accumDeprAcc.currentBalance || 0) + totalDepreciationExpense; 

            await Promise.all([
                expenseAcc.save({ session }),
                accumDeprAcc.save({ session }),
                ...assetUpdates
            ]);
        });

        res.status(200).json({ success: true, message: 'Depreciation successfully calculated and posted to the ledger.' });
    } catch (error) {
        console.error("Depreciation Error:", error);
        res.status(400).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};
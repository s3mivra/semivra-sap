const mongoose = require('mongoose');
const FixedAsset = require('../models/FixedAsset'); // Ensure you have this model!
const JournalEntry = require('../models/JournalEntry');
const Account = require('../models/Account');

const getDivision = (req) => {
    if (req.user?.role?.level === 100) return req.headers['x-division-id'] || req.body.division;
    return req.user?.division;
};

// @desc    Register a new Fixed Asset
exports.registerAsset = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        if (!targetDivision) return res.status(400).json({ error: 'Division ID required' });

        const { assetName, description, purchaseDate, purchasePrice, salvageValue, usefulLifeMonths } = req.body;

        const asset = await FixedAsset.create({
            division: targetDivision,
            assetName,
            description,
            purchaseDate,
            purchasePrice,
            salvageValue,
            usefulLifeMonths,
            currentBookValue: purchasePrice,
            accumulatedDepreciation: 0,
            status: 'Active'
        });

        res.status(201).json({ success: true, data: asset });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// @desc    Get all assets for the division
exports.getAssets = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        const assets = await FixedAsset.find({ division: targetDivision }).sort({ purchaseDate: -1 });
        res.status(200).json({ success: true, data: assets });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

            // 1. Find all active assets that still have value to depreciate
            const assets = await FixedAsset.find({ 
                division: targetDivision, 
                status: 'Active',
                currentBookValue: { $gt: 0 } // Technically > salvageValue, but simplifying for MVP
            }).session(session);

            if (assets.length === 0) throw new Error("No active assets require depreciation.");

            let totalDepreciationExpense = 0;
            const assetUpdates = [];

            // 2. Calculate Straight-Line Depreciation
            for (const asset of assets) {
                // If it's already at or below salvage value, skip it
                if (asset.currentBookValue <= asset.salvageValue) {
                    asset.status = 'Fully Depreciated';
                    assetUpdates.push(asset.save({ session }));
                    continue;
                }

                // Straight Line Math: (Cost - Salvage) / Useful Life
                const monthlyDepreciation = (asset.purchasePrice - asset.salvageValue) / asset.usefulLifeMonths;
                
                // Ensure we don't depreciate past the salvage value on the final month
                const actualDepreciation = Math.min(monthlyDepreciation, asset.currentBookValue - asset.salvageValue);

                asset.accumulatedDepreciation += actualDepreciation;
                asset.currentBookValue -= actualDepreciation;
                
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
                    { account: expenseAcc._id, debit: totalDepreciationExpense, credit: 0, memo: 'Depreciation Expense' },
                    { account: accumDeprAcc._id, debit: 0, credit: totalDepreciationExpense, memo: 'Accumulated Depreciation' }
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
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const mongoose = require('mongoose');

exports.getDashboardMetrics = async (req, res) => {
    try {
        // 1. LOW STOCK ALERTS (Items with 10 or fewer in stock)
        const lowStock = await Product.find({ isPhysical: true, currentStock: { $lte: 10 } })
            .select('name sku currentStock')
            .sort({ currentStock: 1 })
            .limit(10);

        // 2. TOP 5 SELLING PRODUCTS
        const topProducts = await Sale.aggregate([
            { $unwind: "$items" },
            { $group: { _id: "$items.product", totalSold: { $sum: "$items.quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            // Join with the Product collection to get the real name
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
            { $unwind: "$productDetails" },
            { $project: { name: "$productDetails.name", totalSold: 1 } }
        ]);

        // 3. REVENUE TRENDS (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const revenueTrends = await Sale.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Manila" } },
                revenue: { $sum: "$vatableSales" }
            }},
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({ success: true, data: { lowStock, topProducts, revenueTrends } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get Sales grouped by Day and Month
// @route   GET /api/analytics/sales
// @access  Private
exports.getSalesAnalytics = async (req, res) => {
    try {
        const targetDivision = req.headers['x-division-id'] || req.user?.division;
        if (!targetDivision) return res.status(400).json({ success: false, message: 'Division context missing.' });
        
        const divisionId = new mongoose.Types.ObjectId(
            targetDivision._id ? targetDivision._id.toString() : targetDivision.toString()
        );

        // Get the date 30 days ago for the daily chart
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 📊 1. DAILY SALES (Last 30 Days)
        const dailySales = await Sale.aggregate([
            { $match: { division: divisionId, createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'Voided' } } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by YYYY-MM-DD
                totalRevenue: { $sum: "$totalAmount" },
                orderCount: { $sum: 1 }
            }},
            { $sort: { _id: 1 } } // Sort chronologically
        ]);

        // 📈 2. MONTHLY SALES (All Time)
        const monthlySales = await Sale.aggregate([
            { $match: { division: divisionId, status: { $ne: 'Voided' } } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, // Group by YYYY-MM
                totalRevenue: { $sum: "$totalAmount" },
                orderCount: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({ success: true, data: { daily: dailySales, monthly: monthlySales } });
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
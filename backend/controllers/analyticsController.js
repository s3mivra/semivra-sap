const Sale = require('../models/Sale');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// 🛡️ Helper to extract tenant ID securely
const getDivision = (req) => {
    if (req.user?.role?.level === 100) return req.headers['x-division-id'] || req.body.division;
    return req.user?.division;
};

exports.getDashboardMetrics = async (req, res) => {
    try {
        const targetDivision = getDivision(req);
        if (!targetDivision) return res.status(400).json({ error: 'Division ID required' });
        
        const divisionId = new mongoose.Types.ObjectId(
            targetDivision._id ? targetDivision._id.toString() : targetDivision.toString()
        );

        // 🛡️ 1. SECURED LOW STOCK ALERTS
        const lowStock = await Product.find({ 
            division: divisionId, // <-- The Security Fix
            isPhysical: true, 
            currentStock: { $lte: 10 } 
        })
        .select('name sku currentStock')
        .sort({ currentStock: 1 })
        .limit(6);

        // 🛡️ 2. SECURED TOP 5 SELLING PRODUCTS
        const topProducts = await Sale.aggregate([
            { $match: { division: divisionId, status: { $ne: 'Voided' } } }, // <-- The Security Fix
            { $unwind: "$items" },
            { $group: { _id: "$items.product", totalSold: { $sum: "$items.quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
            { $unwind: "$productDetails" },
            { $project: { name: "$productDetails.name", sku: "$productDetails.sku", totalSold: 1 } }
        ]);

        // 🛡️ 3. SECURED 30-DAY REVENUE TRENDS
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const revenueTrends = await Sale.aggregate([
            { $match: { division: divisionId, createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'Voided' } } }, // <-- The Security Fix
            { $group: {
                _id: { $dateToString: { format: "%m-%d", date: "$createdAt" } }, // Group by MM-DD
                revenue: { $sum: "$totalAmount" }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Calculate 30-Day Total for the KPI Card
        const totalRevenue30Days = revenueTrends.reduce((sum, day) => sum + day.revenue, 0);

        res.status(200).json({
            success: true,
            data: {
                kpis: { revenue30Days: totalRevenue30Days },
                topProducts,
                lowStock,
                revenueTrends
            }
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ error: error.message });
    }
};
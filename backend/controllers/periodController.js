const FinancialPeriod = require('../models/FinancialPeriod');

// Helper for division extraction
const getDivision = (req) => req.user.role === 'Super Admin' && req.body.division ? req.body.division : req.user.division;

// Get all periods for the division
exports.getPeriods = async (req, res) => {
    try {
        const periods = await FinancialPeriod.find({ division: getDivision(req) }).sort({ periodCode: -1 });
        res.status(200).json({ success: true, data: periods });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle a Period (Open -> Closed, or Closed -> Open)
exports.togglePeriod = async (req, res) => {
    try {
        const { periodCode, status } = req.body;
        const targetDivision = getDivision(req);

        let period = await FinancialPeriod.findOne({ division: targetDivision, periodCode });

        // If the period doesn't exist yet, create it
        if (!period) {
            period = new FinancialPeriod({ division: targetDivision, periodCode });
        }

        period.status = status;
        
        if (status === 'Closed') {
            period.closedBy = req.user.id || req.user._id;
            period.closedAt = Date.now();
        } else {
            period.closedBy = undefined;
            period.closedAt = undefined;
        }

        await period.save();
        res.status(200).json({ success: true, message: `Period ${periodCode} is now ${status}`, data: period });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
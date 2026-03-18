const AuditLog = require('../models/AuditLog');

// @desc    Get all audit logs
// @route   GET /api/audit-logs
// @access  Private (Super Admin)
exports.getAuditLogs = async (req, res) => {
    try {
        // Fetch logs, populate the user's email, and sort by newest first. Limit to 100 for performance.
        const logs = await AuditLog.find()
            .populate('user', 'email role')
            .sort({ createdAt: -1 })
            .limit(100); 

        res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
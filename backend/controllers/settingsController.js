const SystemSetting = require('../models/SystemSetting');

// Get the current locked date
exports.getSettings = async (req, res) => {
    try {
        let settings = await SystemSetting.findOne();
        if (!settings) {
            settings = await SystemSetting.create({}); // Initialize if it doesn't exist
        }
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update the locked date (Closing the Books)
exports.lockPeriod = async (req, res) => {
    try {
        const { lockedDate } = req.body;
        let settings = await SystemSetting.findOne();
        
        if (!settings) settings = new SystemSetting();
        
        // Prevent unlocking to an earlier date (Strict Audit Rule)
        if (settings.lockedDate && new Date(lockedDate) < new Date(settings.lockedDate)) {
            return res.status(400).json({ success: false, message: 'Security Alert: You cannot unlock a previously closed accounting period.' });
        }

        settings.lockedDate = new Date(lockedDate);
        settings.lockedBy = req.user.id;
        await settings.save();

        res.status(200).json({ success: true, message: `Books successfully closed up to ${new Date(lockedDate).toLocaleDateString()}`, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW: Emergency Override to reopen the books
exports.unlockPeriod = async (req, res) => {
    try {
        let settings = await SystemSetting.findOne();
        if (!settings) return res.status(404).json({ success: false, message: 'Settings not found.' });

        // Reset the clock to the beginning of time
        settings.lockedDate = new Date('2000-01-01'); 
        settings.lockedBy = req.user.id;
        await settings.save();

        res.status(200).json({ success: true, message: 'EMERGENCY OVERRIDE: Books are now fully unlocked.', data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
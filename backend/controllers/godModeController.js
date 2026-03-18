const License = require('../models/License');
const crypto = require('crypto');

// Generate a random 16-character Product Key
const generateKey = () => {
    return crypto.randomBytes(8).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
};

exports.generateNewLicense = async (req, res) => {
    try {
        const { businessName, monthsActive } = req.body;
        
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + parseInt(monthsActive));

        const newLicense = await License.create({
            productKey: generateKey(),
            businessName,
            expiresAt: expiry,
            status: 'Pending',
            usageCount: 0 // Fresh key
        });

        res.status(201).json({ success: true, data: newLicense });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllLicenses = async (req, res) => {
    const licenses = await License.find().sort({ createdAt: -1 });
    res.json({ success: true, data: licenses });
};

// Emergency Reset: If a client gets a new PC, you clear their HWID here
exports.resetHardwareLock = async (req, res) => {
    const { id } = req.params;
    await License.findByIdAndUpdate(id, { machineId: null, usageCount: 0, status: 'Pending' });
    res.json({ success: true, message: "Hardware lock removed. Key can be reused once." });
};
const axios = require('axios');

// Note: In production, store this URL in your client backend's .env file
const GOD_MODE_SERVER = process.env.GOD_MODE_URL || 'http://localhost:6001/api/external';

exports.verifyClientLicense = async (req, res) => {
    const { licenseKey, hwid } = req.body;

    if (!licenseKey || !hwid) {
        return res.status(400).json({ success: false, message: "License Key and Hardware ID are required." });
    }

    try {
        // SERVER-TO-SERVER POST: The frontend never sees this happen
        const response = await axios.post(`${GOD_MODE_SERVER}/verify`, {
            key: licenseKey,
            hwid: hwid
        });

        // If God Mode approves, pass the success back to React
        if (response.data.valid) {
            return res.status(200).json({ 
                success: true, 
                expiresAt: response.data.expiresAt 
            });
        }
    } catch (error) {
        // Catch rejections from God Mode (e.g., "Hardware Mismatch", "Suspended")
        const errorMessage = error.response?.data?.message || "Failed to reach License Activation Server.";
        return res.status(403).json({ success: false, message: errorMessage });
    }
};
const axios = require('axios');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { machineIdSync } = require('node-machine-id');

exports.verifyClientLicense = async (req, res) => {
    const { licenseKey } = req.body; 
    if (!licenseKey) return res.status(400).json({ success: false, message: "Product Key is required." });

    try {
        const hwid = machineIdSync();
        const deviceName = os.hostname(); 
        
        // Ensure no trailing slash in your .env GOD_MODE_URL
        const godModeUrl = process.env.GOD_MODE_URL; 
        const verifyEndpoint = `${godModeUrl}/api/external/verify`;

        const response = await axios.post(verifyEndpoint, {
            key: licenseKey,
            hwid: hwid,
            deviceName: deviceName
        }, {
            headers: { 'x-master-server-key': process.env.GOD_MODE_SECRET_KEY }
        });

        if (response.data.valid) {
            // 🚨 NEW: SAVE THE KEY LOCALLY SO THE ERP REMEMBERS IT
            const configPath = path.join(__dirname, '../license.json');
            await fs.writeFile(configPath, JSON.stringify({ activeKey: licenseKey }));

            return res.status(200).json({ 
                success: true,
                message: "System Activated Successfully!", 
                expiresAt: response.data.expiresAt 
            });
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || "Failed to reach License Server. Check your internet or Vercel URL.";
        return res.status(403).json({ success: false, message: errorMessage });
    }
};
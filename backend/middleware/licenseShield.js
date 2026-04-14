const axios = require('axios');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { machineIdSync } = require('node-machine-id');

// Temporary Memory Cache to store valid licenses
// Format: { "XXXX-XXXX-HWID": { verifiedAt: Timestamp } }
const licenseCache = new Map();

const licenseShield = async (req, res, next) => {
    try {
        // 1. Retrieve the saved Product Key (from when they activated)
        const configPath = path.join(__dirname, '../license.json');
        if (!fs.existsSync(configPath)) {
            return res.status(402).json({ success: false, message: "System Locked: Not Activated. Please enter a product key." });
        }
        const { activeKey } = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // 2. Generate the unbreakable physical Hardware ID
        const hwid = machineIdSync();
        const deviceName = os.hostname();

        const cacheString = `${activeKey}-${hwid}`;
        const cachedRecord = licenseCache.get(cacheString);
        const now = Date.now();

        // 3. FAST PATH: If verified within the last 1 hour, let them through instantly
        if (cachedRecord && (now - cachedRecord.verifiedAt < 3600000)) {
            return next();
        }

        // 4. SLOW PATH: Time to "Call Home" to God Mode on Vercel
        const verifyEndpoint = `${process.env.GOD_MODE_URL}/api/external/verify`;
        
        const { data } = await axios.post(verifyEndpoint, { 
            key: activeKey, 
            hwid: hwid,
            deviceName: deviceName 
        }, {
            // 🚨 CRITICAL: Vercel will reject the request without this password header!
            headers: { 'x-master-server-key': process.env.GOD_MODE_SECRET_KEY }
        });

        if (data.valid) {
            // Update the cache with the new verified timestamp
            licenseCache.set(cacheString, { verifiedAt: now });
            return next();
        } else {
            return res.status(402).json({ success: false, message: "License Invalid, Suspended, or Expired." });
        }

    } catch (error) {
        // 5. OFFLINE GRACE PERIOD
        // If the internet is down (Axios fails), but they were successfully verified in the last 24 hours, let them work.
        
        // Safely re-read variables in case the crash happened inside Axios
        const configPath = path.join(__dirname, '../license.json');
        if (fs.existsSync(configPath)) {
            const { activeKey } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const hwid = machineIdSync();
            const cacheString = `${activeKey}-${hwid}`;
            const cachedRecord = licenseCache.get(cacheString);
            const now = Date.now();

            if (cachedRecord && (now - cachedRecord.verifiedAt < 86400000)) {
                console.warn(`God Mode unreachable. Operating in Offline Grace Period for ${activeKey}`);
                return next();
            }
        }

        // If they have been offline for over 24 hours, or Vercel specifically rejected them, lock it down.
        console.error("Vercel Connection Error:", error.message);
        return res.status(402).json({ 
            success: false, 
            message: "License Error: Unable to reach License Server. Please connect to the internet to verify your subscription." 
        });
    }
};

module.exports = licenseShield;
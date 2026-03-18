const axios = require('axios');

const GOD_MODE_SERVER = process.env.GOD_MODE_URL || 'http://localhost:6001/api/external';

// Temporary Memory Cache to store valid licenses
// Format: { "XXXX-XXXX-HWID": { verifiedAt: Timestamp } }
const licenseCache = new Map();

const licenseShield = async (req, res, next) => {
    const key = req.headers['x-product-key'];
    const hwid = req.headers['x-hwid'];

    if (!key || !hwid) {
        return res.status(402).json({ success: false, message: "System Locked: License Required" });
    }

    const cacheString = `${key}-${hwid}`;
    const cachedRecord = licenseCache.get(cacheString);
    const now = Date.now();

    // 1. FAST PATH: If verified within the last 1 hour, let them through instantly
    if (cachedRecord && (now - cachedRecord.verifiedAt < 3600000)) {
        return next();
    }

    // 2. SLOW PATH: Time to "Call Home" to God Mode
    try {
        const { data } = await axios.post(`${GOD_MODE_SERVER}/verify`, { key, hwid });

        if (data.valid) {
            // Update the cache with the new verified timestamp
            licenseCache.set(cacheString, { verifiedAt: now });
            return next();
        } else {
            return res.status(402).json({ success: false, message: "License Suspended or Expired." });
        }
    } catch (error) {
        // 3. OFFLINE GRACE PERIOD
        // If the internet is down, but they were successfully verified in the last 24 hours, let them work.
        if (cachedRecord && (now - cachedRecord.verifiedAt < 86400000)) {
            console.warn(`God Mode unreachable. Operating in Offline Grace Period for ${key}`);
            return next();
        }

        // If they have been offline for over 24 hours, lock the system down.
        return res.status(402).json({ 
            success: false, 
            message: "Unable to reach License Server. Please connect to the internet to verify your subscription." 
        });
    }
};

module.exports = licenseShield;
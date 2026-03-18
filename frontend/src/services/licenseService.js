import api from './api';

/**
 * VERIFY ONLY: The client app only asks its own backend to check the key.
 * Notice we added 'hwid' (Hardware ID) so we can lock it to this specific machine.
 */
export const verifyLicenseKey = async (licenseKey, hwid) => {
    // We send both the key and the machine fingerprint to the Client's Backend
    const response = await api.post('/licenses/verify', { licenseKey, hwid });
    return response.data;
};

// 🛑 DELETED: generateNewLicense
// 🛑 DELETED: revokeLicense
// These powers have been permanently moved to your local "Ultimate God Mode" app. 
// They no longer exist in the client's universe.
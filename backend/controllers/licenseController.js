const License = require('../models/License');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Generate a new license key (Usually called after a successful transaction)
 * @route   POST /api/licenses/generate
 * @access  Private (Admin/Super Admin or System internal)
 */
exports.generateLicense = async (req, res) => {
    try {
        const { productId, userId, durationInDays } = req.body;

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (durationInDays || 365));

        const newLicense = await License.create({
            licenseKey: uuidv4(), // Generates a unique string like '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
            product: productId,
            user: userId,
            expiresAt,
            status: 'Active'
        });

        res.status(201).json({ success: true, data: newLicense });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate license', error: error.message });
    }
};

/**
 * @desc    Verify a license key (Used by the client software to check validity)
 * @route   POST /api/licenses/verify
 * @access  Public (Requires API Key or just the License Key depending on your architecture)
 */
exports.verifyLicense = async (req, res) => {
    try {
        const { licenseKey } = req.body;

        if (!licenseKey) {
            return res.status(400).json({ success: false, message: 'License key is required' });
        }

        const license = await License.findOne({ licenseKey }).populate('product', 'name');

        // 1. Check if it exists
        if (!license) {
            return res.status(404).json({ success: false, message: 'Invalid license key' });
        }

        // 2. Check if it's revoked
        if (license.status === 'Revoked') {
            return res.status(403).json({ success: false, message: 'This license has been revoked' });
        }

        // 3. Check for expiration
        if (new Date() > new Date(license.expiresAt)) {
            license.status = 'Expired';
            await license.save(); // Auto-update status to Expired
            return res.status(403).json({ success: false, message: 'License has expired' });
        }

        res.status(200).json({ success: true, message: 'License is valid', data: license });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Verification error', error: error.message });
    }
};

/**
 * @desc    Revoke a license (Fraud prevention or refund)
 * @route   PUT /api/licenses/:id/revoke
 * @access  Private (Admin / Super Admin)
 */
exports.revokeLicense = async (req, res) => {
    try {
        const license = await License.findById(req.params.id);
        if (!license) return res.status(404).json({ success: false, message: 'License not found' });

        license.status = 'Revoked';
        await license.save();

        res.status(200).json({ success: true, message: 'License revoked successfully', data: license });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
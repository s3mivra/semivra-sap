const express = require('express');
const { generateLicense, verifyLicense, revokeLicense } = require('../controllers/licenseController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

// Public route for client software to ping
router.post('/verify', verifyLicense);

// Protected routes for Admins and the System
router.post(
    '/generate', 
    protect, 
    authorize('Admin', 'Super Admin'), 
    auditLog('GENERATE_LICENSE'), 
    generateLicense
);

router.put(
    '/:id/revoke', 
    protect, 
    authorize('Admin', 'Super Admin'), 
    auditLog('REVOKE_LICENSE'), 
    revokeLicense
);

module.exports = router;
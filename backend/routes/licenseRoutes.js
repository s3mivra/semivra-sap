const express = require('express');
const router = express.Router();
const { verifyClientLicense } = require('../controllers/licenseController');

// The React app will POST to /api/licenses/verify
router.post('/verify', verifyClientLicense);

module.exports = router;
const express = require('express');
const { getSettings, lockPeriod, unlockPeriod } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 1. Everyone must be logged in
router.use(protect); 

// 2. Both Admins and Super Admins can VIEW and LOCK the books
router.get('/', authorize('Admin', 'Super Admin'), getSettings);
router.post('/lock', authorize('Admin', 'Super Admin'), lockPeriod);

// 3. THE VAULT: ONLY Super Admins can UNLOCK the books
router.post('/unlock', authorize('Super Admin'), unlockPeriod);

module.exports = router;
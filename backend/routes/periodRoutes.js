const express = require('express');
const router = express.Router();
const periodController = require('../controllers/periodController');
const { protect, authorize } = require('../middleware/auth'); 

router.use(protect);

router.get('/', authorize('Admin', 'Super Admin', 'Accountant'), periodController.getPeriods);
router.post('/toggle', authorize('Admin', 'Super Admin'), periodController.togglePeriod); // Only high-level admins can lock/unlock

module.exports = router;
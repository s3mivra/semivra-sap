const express = require('express'); // <-- FIXED: This should be 'express', not ' manufacturingRoutes'
const router = express.Router();
const manufacturingController = require('../controllers/manufacturingController');
const { protect } = require('../middleware/auth'); 

// Execute a multi-level BOM production run
router.post('/run', protect, manufacturingController.executeProductionRun);

module.exports = router;
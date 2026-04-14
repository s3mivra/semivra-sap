const express = require('express');
const router = express.Router();
const arController = require('../controllers/arController');
const { protect, authorize } = require('../middleware/auth'); 

router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

// Your existing payment routes
router.get('/unpaid', arController.getUnpaidSales);
router.post('/pay/:id', arController.receivePayment);

// 👇 The new Aging route we just added 👇
router.get('/aging', arController.getARAgingReport);

module.exports = router;
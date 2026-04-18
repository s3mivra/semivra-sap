const express = require('express');
const router = express.Router();
const { getUnpaidReceivables, receivePayment, getCustomerStatement } = require('../controllers/arController');
const { protect } = require('../middleware/auth'); // Or whatever your auth middleware is named

// Your existing payment routes
router.get('/unpaid', protect, getUnpaidReceivables);

// 🛡️ THE FIX: Add the missing payment route that React is looking for!
router.post('/:id/pay', protect, receivePayment);

router.get('/statement/:customerId', protect, getCustomerStatement);
module.exports = router;
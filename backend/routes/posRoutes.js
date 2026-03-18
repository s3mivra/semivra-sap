const express = require('express');
const { processCheckout, getSalesHistory, processRefund } = require('../controllers/posController'); // <-- Update your import!
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

router.post('/checkout', protect, authorize('Admin', 'Super Admin', 'User'), auditLog('POS_CHECKOUT'), processCheckout);
router.get('/history', getSalesHistory);
router.post('/:id/refund', auditLog('SALE_REFUNDED'), processRefund);

module.exports = router;
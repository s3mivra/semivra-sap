const express = require('express');
const { getUnpaidSales, receivePayment } = require('../controllers/arController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

router.get('/unpaid', getUnpaidSales);
router.post('/:id/pay', auditLog('AR_PAYMENT_RECEIVED'), receivePayment);

module.exports = router;
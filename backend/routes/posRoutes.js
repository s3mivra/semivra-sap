const express = require('express');
const Joi = require('joi');
const { processCheckout, getSalesHistory, processRefund } = require('../controllers/posController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const { validateBody } = require('../middleware/validate'); // 🛡️ Import the shield

const router = express.Router();

// 🛒 POS Checkout Schema (Prevents negative quantities and fake prices)
const checkoutSchema = Joi.object({
    items: Joi.array().items(
        Joi.object({
            product: Joi.string().hex().length(24).required(), // Must be a valid MongoDB ObjectId
            quantity: Joi.number().integer().min(1).required(), // Cannot sell 0 or negative items!
            price: Joi.number().min(0).required()
        })
    ).min(1).required(), // Cart cannot be empty
    paymentMethod: Joi.string().valid('Cash', 'Card', 'GCash', 'AR', 'Other').required(),
    amountPaid: Joi.number().min(0).required(),
    customer: Joi.string().hex().length(24).allow(null, '').optional()
});

// 💸 Refund Schema
const refundSchema = Joi.object({
    reason: Joi.string().min(5).max(200).required(),
    warehouseId: Joi.string().hex().length(24).allow(null, '').optional() // If returning to stock
});

// 🔒 Apply the shield BEFORE the audit log or controller
router.post('/checkout', protect, authorize('Admin', 'Super Admin', 'User'), validateBody(checkoutSchema), auditLog('POS_CHECKOUT'), processCheckout);
router.get('/history', protect, getSalesHistory);
router.post('/:id/refund', protect, validateBody(refundSchema), auditLog('SALE_REFUNDED'), processRefund);

module.exports = router;
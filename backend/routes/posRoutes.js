const express = require('express');
const Joi = require('joi');
const { processCheckout, getSalesHistory, processRefund } = require('../controllers/posController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const { validateBody } = require('../middleware/validate'); // 🛡️ Import the shield

const router = express.Router();

// 🛒 POS Checkout Schema (Updated to match the actual frontend payload!)
const checkoutSchema = Joi.object({
    items: Joi.array().items(
        Joi.object({
            product: Joi.string().hex().length(24).required(),
            quantity: Joi.number().integer().min(1).required(),
            price: Joi.number().min(0).required()
        }).unknown(true) // 🛡️ Allows the frontend to send UI junk like 'name' without crashing
    ).min(1).required(),
    
    paymentMethod: Joi.string().valid('Cash', 'Card', 'GCash', 'AR', 'Other').required(),
    
    // 👇 Adding the fields your frontend actually sends!
    warehouseId: Joi.string().hex().length(24).required(), // Controller needs this for inventory
    taxRate: Joi.number().min(0).optional(),
    discountAmount: Joi.number().min(0).optional(),
    customerName: Joi.string().allow(null, '').optional(),
    
    // We make this optional since your controller calculates the final total anyway
    amountPaid: Joi.number().min(0).optional() 
}).unknown(true); // 🛡️ Allows any other harmless extra data to pass through
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
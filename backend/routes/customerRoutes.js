const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth'); 

// Anyone logged in can access customers, but their Division dictates WHICH customers they see.
router.use(protect);

router.route('/')
    .post(authorize('Admin', 'Super Admin', 'Cashier'), customerController.createCustomer)
    .get(customerController.getCustomers);

router.route('/:id')
    .put(authorize('Admin', 'Super Admin'), customerController.updateCustomer);

module.exports = router;
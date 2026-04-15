const express = require('express');
const { 
    createProduct,
    deleteProduct,
    getProducts, 
    updateProduct, 
    deactivateProduct 
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

// Public route: Anyone can view the product catalog
router.get('/', getProducts);
router.delete('/:id', protect, authorize('Admin', 'Super Admin'), auditLog('DEACTIVATE_PRODUCT'), deleteProduct);

// Admin / Super Admin routes: Manage products
router.post('/', protect, authorize('Admin', 'Super Admin'), auditLog('CREATE_PRODUCT'), createProduct);
router.put('/:id', protect, authorize('Admin', 'Super Admin'), auditLog('UPDATE_PRODUCT'), updateProduct);
router.delete('/:id', protect, authorize('Admin', 'Super Admin'), auditLog('DEACTIVATE_PRODUCT'), deactivateProduct);

module.exports = router;
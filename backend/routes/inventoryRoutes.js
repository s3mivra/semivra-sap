const express = require('express');
const { 
    createUnit, getUnits, 
    createWarehouse, getWarehouses, 
    recordMovement, getStockHistory 
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

// Publicly readable for the frontend product forms
router.get('/units', getUnits);
router.get('/warehouses', getWarehouses);

// Protected Inventory Management Routes
router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

router.post('/units', auditLog('CREATE_UNIT'), createUnit);
router.post('/warehouses', auditLog('CREATE_WAREHOUSE'), createWarehouse);

router.post('/movements', auditLog('RECORD_STOCK_MOVEMENT'), recordMovement);
router.get('/movements', auditLog('VIEW_STOCK_HISTORY'), getStockHistory);

module.exports = router;
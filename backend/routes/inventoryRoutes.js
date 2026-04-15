const express = require('express');
const { 
    createUnit, getUnits, updateUnit, deleteUnit,
    createWarehouse, getWarehouses, 
    recordMovement, getStockHistory, recordProduction
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

router.post('/units', authorize('Admin', 'Super Admin', 'Manage Inventory'), auditLog('CREATE_UNIT'), createUnit);
router.put('/units/:id', authorize('Admin', 'Super Admin', 'Manage Inventory'), auditLog('UPDATE_UNIT'), updateUnit);
router.delete('/units/:id', authorize('Admin', 'Super Admin', 'Manage Inventory'), auditLog('DELETE_UNIT'),  deleteUnit);
router.post('/produce', authorize('Admin', 'Super Admin', 'Kitchen', 'Cashier'), recordProduction);
router.post('/warehouses', auditLog('CREATE_WAREHOUSE'), createWarehouse);

router.post('/movements', auditLog('RECORD_STOCK_MOVEMENT'), recordMovement);
router.get('/movements', auditLog('VIEW_STOCK_HISTORY'), getStockHistory);

module.exports = router;
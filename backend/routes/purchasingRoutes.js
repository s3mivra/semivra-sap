const express = require('express');
const { 
    createSupplier, getSuppliers, addCatalogItem, // <-- Ensure addCatalogItem is imported here!
    createPO, getPOs, receivePO 
} = require('../controllers/purchasingController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin', 'Super Admin'));

// --- SUPPLIER ROUTES ---
router.route('/suppliers')
    .get(getSuppliers)
    .post(auditLog('CREATE_SUPPLIER'), createSupplier);

// The exact route causing the 404! It must look exactly like this:
router.post('/suppliers/:id/catalog', auditLog('UPDATE_SUPPLIER_CATALOG'), addCatalogItem);

// --- PO ROUTES ---
router.route('/pos')
    .get(getPOs)
    .post(auditLog('CREATE_PO'), createPO);

router.post('/pos/:id/receive', auditLog('RECEIVE_PO'), receivePO);

module.exports = router;
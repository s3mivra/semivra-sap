const express = require('express');
// 👇 Added the update and delete controllers
const { createCategory, getCategories, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

// 🌐 PUBLIC/STOREFRONT ROUTE: 
// Anyone can view categories, but the database only returns the ones 
// matching the 'x-division-id' header sent by our frontend api.js
router.get('/', getCategories);

// 🛡️ PROTECTED ERP ROUTES: Only Admins can modify Master Data
router.post('/', protect, authorize('Admin', 'Super Admin'), auditLog('CREATE_CATEGORY'), createCategory);
router.put('/:id', protect, authorize('Admin', 'Super Admin'), auditLog('UPDATE_CATEGORY'), updateCategory);
router.delete('/:id', protect, authorize('Admin', 'Super Admin'), auditLog('DELETE_CATEGORY'), deleteCategory);

module.exports = router;
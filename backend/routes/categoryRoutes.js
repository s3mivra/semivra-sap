const express = require('express');
const { createCategory, getCategories } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

// Publicly readable (so the frontend store can filter by category)
router.get('/', getCategories);

// Only Admins can modify Master Data
router.post('/', protect, authorize('Admin', 'Super Admin'), auditLog('CREATE_CATEGORY'), createCategory);

module.exports = router;
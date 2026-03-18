const express = require('express');
const { getAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Only Super Admins can view the immutable compliance logs
router.get('/', protect, authorize('Super Admin'), getAuditLogs);

module.exports = router;
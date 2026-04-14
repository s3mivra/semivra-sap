const express = require('express');
// UPDATE your import to include updateUserRole
const { getUsers, createUser, deleteUser, updateUserRole } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { initializeERP } = require('../controllers/systemController');

const router = express.Router();

router.use(protect);
router.use(authorize('Super Admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.delete('/:id', deleteUser);

// NEW: The Role Update Route
router.put('/:id/role', updateUserRole);

router.post('/system/init', initializeERP);

module.exports = router;
const express = require('express');
const { getUsers, updateUserRole, deleteUser, createUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

// All user management routes require Super Admin privileges
router.use(protect);
router.use(authorize('Super Admin')); 

router.route('/')
    .get(auditLog('VIEW_USERS'), getUsers)
    .post(auditLog('CREATE_USER'), createUser); // New Create Route

router.route('/:id/role')
    .put(auditLog('UPDATE_USER_ROLE'), updateUserRole);

router.route('/:id')
    .delete(auditLog('DELETE_USER'), deleteUser);

    

module.exports = router;
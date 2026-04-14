const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { protect, authorize } = require('../middleware/auth'); 

router.use(protect);

router.route('/')
    .get(roleController.getRoles)
    .post(authorize('Super Admin'), roleController.createRole);

router.route('/:id')
    .delete(authorize('Super Admin'), roleController.deleteRole);

router.put('/:id', protect, authorize('manage_roles', 'god_mode'), roleController.updateRole);

module.exports = router;
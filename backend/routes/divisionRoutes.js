const express = require('express');
const router = express.Router();
const divisionController = require('../controllers/divisionController');
const { protect, authorize } = require('../middleware/auth'); 

// 🚨 Secure all routes: Only God Mode (Super Admins) can manage silos
router.use(protect);
router.use(authorize('Super Admin')); // Or pass whatever specific permission string your God Mode requires

router.route('/')
    .post(divisionController.createDivision)
    .get(divisionController.getDivisions);

router.route('/:id/toggle')
    .put(divisionController.toggleDivisionStatus);

module.exports = router;
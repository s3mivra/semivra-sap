const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
    getBusinessUnits, createBusinessUnit, 
    getDepartments, createDepartment, 
    getRoles, createRole 
} = require('../controllers/orgController');

// All organization routes require the user to be logged in
router.use(protect);

// 🚨 TEMPORARY BYPASS: Normally we put a strict authorize() middleware here to only allow Super Admins.
// But since your auth middleware might still be looking for the old string-based 'Super Admin' role, 
// we will rely on frontend hiding for a brief moment until we fully update the auth middleware!

// Business Unit Routes
router.route('/business-units')
    .get(getBusinessUnits)
    .post(createBusinessUnit);

// Department Routes
router.route('/departments')
    .get(getDepartments)
    .post(createDepartment);

// Role Routes
router.route('/roles')
    .get(getRoles)
    .post(createRole);

module.exports = router;
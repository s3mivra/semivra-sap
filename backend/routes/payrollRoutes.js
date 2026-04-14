const express = require('express');
const router = express.Router();
const { draftPayroll, approveAndPay, getPayrollRuns } = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');

// All payroll routes are strictly protected
router.use(protect);

router.post('/draft', authorize('Super Admin', 'HR Manager'), draftPayroll);
router.post('/:id/approve', authorize('Super Admin', 'HR Manager'), approveAndPay);
router.get('/', authorize('Super Admin', 'HR Manager', 'Accountant'), getPayrollRuns);

module.exports = router;
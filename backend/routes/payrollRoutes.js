const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { draftPayroll, approveAndPay, getPayrollRuns } = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate'); // 🛡️ Import the shield

// 🛡️ Strict schema to prevent chronologically impossible payroll periods
const draftSchema = Joi.object({
    periodStart: Joi.date().iso().required(),
    // Enforce that periodEnd MUST be greater than or equal to periodStart
    periodEnd: Joi.date().iso().min(Joi.ref('periodStart')).required()
});

// All payroll routes are strictly protected
router.use(protect);

router.post('/draft', authorize('Super Admin', 'HR Manager'), validateBody(draftSchema), draftPayroll);
router.post('/:id/approve', authorize('Super Admin', 'HR Manager'), approveAndPay);
router.get('/', authorize('Super Admin', 'HR Manager', 'Accountant'), getPayrollRuns);

module.exports = router;
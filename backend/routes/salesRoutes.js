const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { protect } = require('../middleware/auth'); 
const licenseShield = require('../middleware/licenseShield'); 

router.use(protect);
router.use(licenseShield);

router.post('/invoice', salesController.createInvoice);

module.exports = router;
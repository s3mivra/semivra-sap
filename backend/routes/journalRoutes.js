const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
// Assuming you have an auth middleware to check who is logged in
const { protect } = require('../middleware/auth'); 
const licenseShield = require('../middleware/licenseShield'); 

// Secure all accounting routes behind your auth and license guard
router.use(protect);
router.use(licenseShield);

router.route('/')
    .post(journalController.createJournalEntry)
    .get(journalController.getJournalEntries);

router.route('/:id/void')
    .post(journalController.voidJournalEntry);
    
module.exports = router;
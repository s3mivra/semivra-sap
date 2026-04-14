const express = require('express');
const router = express.Router();
const Joi = require('joi');
const journalController = require('../controllers/journalController');
const { protect } = require('../middleware/auth'); 
const licenseShield = require('../middleware/licenseShield'); 
const { validateBody } = require('../middleware/validate');

// 🛡️ Strict Schema for Mathematical Precision & Data Integrity
const journalEntrySchema = Joi.object({
    entryNumber: Joi.string().required(),
    period: Joi.string().pattern(/^\d{4}-\d{2}$/).required(), // Strict YYYY-MM enforcement
    documentDate: Joi.date().iso().required(),
    postingDate: Joi.date().iso().required(),
    description: Joi.string().max(500).required(),
    sourceDocument: Joi.string().allow('', null), // Optional field
    lines: Joi.array().items(
        Joi.object({
            account: Joi.string().hex().length(24).required(), // MongoDB ObjectId validation
            debit: Joi.number().min(0).default(0),
            credit: Joi.number().min(0).default(0),
            memo: Joi.string().allow('', null)
        }).custom((obj, helpers) => {
            // Mutual Exclusivity: A single ledger line cannot have both a Debit and a Credit
            if (obj.debit > 0 && obj.credit > 0) return helpers.error('any.invalid');
            return obj;
        })
    ).min(2).required() // Strict Double-Entry minimum
});

// Secure all accounting routes behind your auth and license guard
router.use(protect);
router.use(licenseShield);

// 🟢 Standard Journal Entries (Now Armor-Plated)
router.route('/')
    .post(validateBody(journalEntrySchema), journalController.createJournalEntry)
    .get(journalController.getJournalEntries);

// 🟢 The New Accrual Engine Endpoint
router.post('/accrual', validateBody(journalEntrySchema), journalController.createAccrual);

// 🟢 Voiding Entries
router.route('/:id/void')
    .post(journalController.voidJournalEntry);
    
module.exports = router;
const Joi = require('joi');

exports.journalEntrySchema = Joi.object({
    description: Joi.string().min(3).max(255).required(),
    documentDate: Joi.date().iso().required(),
    sourceDocument: Joi.string().allow('', null).optional(),
    lines: Joi.array().items(
        Joi.object({
            account: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
                'string.pattern.base': 'Invalid Account ID format'
            }),
            debit: Joi.number().min(0).default(0),
            credit: Joi.number().min(0).default(0),
            memo: Joi.string().allow('', null).optional()
        })
    ).min(2).required().custom((value, helpers) => {
        // Custom rule: Ensure debits equal credits before even hitting the database
        let totalDebit = 0;
        let totalCredit = 0;
        
        value.forEach(line => {
            totalDebit += line.debit || 0;
            totalCredit += line.credit || 0;
        });

        // Use Math.round to avoid floating point precision errors
        if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
            return helpers.message('Total Debits must equal Total Credits');
        }
        if (totalDebit === 0) {
            return helpers.message('Journal entry must have a non-zero value');
        }
        
        return value;
    })
});

exports.voidJournalSchema = Joi.object({
    voidReason: Joi.string().min(5).max(255).required()
});
const Joi = require('joi');

exports.validateBody = (schema) => {
    return (req, res, next) => {
        // abortEarly: false ensures we return ALL validation errors at once, not just the first one
        const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        
        if (error) {
            const errorMessages = error.details.map(detail => detail.message);
            return res.status(400).json({ 
                error: 'Validation Failed', 
                details: errorMessages 
            });
        }
        next();
    };
};
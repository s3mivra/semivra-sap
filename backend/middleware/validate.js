const Joi = require('joi');

const validateBody = (schema) => {
    return (req, res, next) => {
        // Validate req.body. 'stripUnknown: true' removes any sneaky extra fields the user sends that aren't in our schema
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        
        if (error) {
            // Format the errors nicely for the frontend
            const errorDetails = error.details.map(detail => detail.message).join(', ');
            return res.status(400).json({ 
                success: false,
                message: 'Validation Error: Invalid Payload', 
                details: errorDetails 
            });
        }
        
        // Replace req.body with the sanitized value
        req.body = value;
        next();
    };
};

module.exports = { validateBody };
const validateBody = (schema) => {
    return (req, res, next) => {
        // validate the request body against the provided Joi schema
        const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        
        if (error) {
            // Map the Joi errors into a clean array of readable messages
            const errorMessages = error.details.map(detail => detail.message.replace(/"/g, ''));
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid request data', 
                errors: errorMessages 
            });
        }
        
        next(); // Data is perfectly valid, proceed to the controller
    };
};

module.exports = { validateBody };
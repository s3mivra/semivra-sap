const AuditLog = require('../models/AuditLog');

const auditLog = (action) => {
    return async (req, res, next) => {
        // We don't want the request to hang if logging fails, so we don't await it blocking the next()
        try {
            AuditLog.create({
                user: req.user ? req.user.id : null,
                action: action,
                resource: req.originalUrl,
                ipAddress: req.ip || req.connection.remoteAddress
            }).catch(err => console.error('Audit Log DB Error:', err.message));
        } catch (error) {
            console.error('Audit Middleware Error:', error.message);
        }
        
        // Continue to the actual controller function immediately
        next();
    };
};

module.exports = auditLog;
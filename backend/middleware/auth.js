const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the user model to check the DB

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Look up the user in the DB to check their current active session
        const currentUser = await User.findById(decoded.id).select('currentSessionToken');

        // SECURITY CHECK: If the token in the DB does not match the token in the JWT...
        if (!currentUser || currentUser.currentSessionToken !== decoded.sessionToken) {
            return res.status(401).json({ message: 'Session expired or logged in from another device.' });
        }

        req.user = decoded; // Attach user payload to request
        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
// Role-Based Access Control (RBAC)
const authorize = (...roles) => {
    return (req, res, next) => {
        // Super Admin override: can access anything
        if (req.user.role === 'Super Admin') {
            return next();
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `User role ${req.user.role} is not authorized to access this route` 
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
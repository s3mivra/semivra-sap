const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // 1. Extract the token from the headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        // 2. Verify the token signature
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Find the user and attach their full Role and Division data
        const user = await User.findById(decoded.id).populate('role division');

        if (!user) {
            return res.status(401).json({ success: false, message: 'The user belonging to this token no longer exists.' });
        }

        // 4. THE FIX: The Safe Session Token Check
        // Only reject if BOTH tokens exist AND they don't match. 
        if (user.currentSessionToken && decoded.sessionToken && user.currentSessionToken !== decoded.sessionToken) {
            return res.status(401).json({ success: false, message: 'Session expired. You logged in from another device.' });
        }

        // 5. Grant Access
        req.user = user;
        next();
    } catch (err) {
        console.error("Token Verification Failed:", err.message);
        return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
    }
};

// ... your authorize/role middleware below ...
// Role-Based Access Control (RBAC)
// FIX 3: Changed ...roles to ...requiredPermissions to match the logic inside!
const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        // THE GOD MODE BYPASS: If they are level 100, let them through instantly!
        if (req.user && req.user.role && req.user.role.level === 100) {
            return next();
        }

        // If they aren't God Mode, check their specific permissions
        if (!req.user.role || !req.user.role.permissions) {
             return res.status(403).json({ success: false, message: 'Access denied. Invalid role.' });
        }

        const hasPermission = req.user.role.permissions.some(p => requiredPermissions.includes(p));
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: 'Access denied. Missing permissions.' });
        }
        
        next();
    };
};

module.exports = { protect, authorize };
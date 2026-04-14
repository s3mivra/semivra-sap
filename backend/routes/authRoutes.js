const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, getMe, logout, refreshToken } = require('../controllers/authController');
const auditLog = require('../middleware/auditLog');
const { protect } = require('../middleware/auth'); // or authMiddleware.js

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to exactly 5 login attempts per window
    message: {
        success: false,
        message: 'Too many failed login attempts from this IP. The system has locked your IP for 15 minutes for security purposes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the deprecated `X-RateLimit-*` headers
});

router.post('/register', auditLog('USER_REGISTER'), registerUser);
router.post('/login', auditLog('USER_LOGIN'), loginLimiter, loginUser);
router.post('/logout', logout);

// 👇 3. ADD THE NEW ROUTE! (Notice it is a GET request, and uses protect)
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);
module.exports = router;
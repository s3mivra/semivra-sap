const express = require('express');
// 👇 1. Add getMe to your imports
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const auditLog = require('../middleware/auditLog');

// 👇 2. Import your auth middleware (Make sure this path matches your actual file!)
const { protect } = require('../middleware/auth'); // or authMiddleware.js

const router = express.Router();

router.post('/register', auditLog('USER_REGISTER'), registerUser);
router.post('/login', auditLog('USER_LOGIN'), loginUser);

// 👇 3. ADD THE NEW ROUTE! (Notice it is a GET request, and uses protect)
router.get('/me', protect, getMe);

module.exports = router;
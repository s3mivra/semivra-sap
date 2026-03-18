const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

router.post('/register', auditLog('USER_REGISTER'), registerUser);
router.post('/login', auditLog('USER_LOGIN'), loginUser);

module.exports = router;
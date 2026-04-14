const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); 

// 💡 1. Short-Lived Access Token (15 Minutes)
const generateToken = (id, role, sessionToken) => {
    return jwt.sign({ id, role, sessionToken }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

// 💡 2. Long-Lived Refresh Token (7 Days)
const generateRefreshToken = (id, sessionToken) => {
    // If you add a JWT_REFRESH_SECRET to your .env later, use it here!
    return jwt.sign({ id, sessionToken }, process.env.JWT_SECRET, { expiresIn: '7d' }); 
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({ name, email, password: hashedPassword });

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please log in.'
        });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email })
            .populate('role')
            .populate('division'); 
        
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        // Generate and save the Session Token to prevent multi-device bugs
        const sessionToken = crypto.randomBytes(20).toString('hex');
        await User.updateOne({ _id: user._id }, { currentSessionToken: sessionToken });

        // Generate BOTH tokens
        const token = generateToken(user._id, user.role ? user.role._id : null, sessionToken);
        const refreshToken = generateRefreshToken(user._id, sessionToken);

        res.status(200).json({
            success: true,
            token: token,
            refreshToken: refreshToken, // 🚨 THE FIX: Send the refresh token to React
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role, 
                division: user.division 
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Refresh Session Token
// @route   POST /api/auth/refresh
// @access  Public (Requires valid refresh token in body)
exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token is missing.' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).populate('role');
        
        // Ensure user exists and is not deactivated
        if (!user || user.isActive === false) {
            return res.status(403).json({ success: false, message: 'User account is no longer active.' });
        }

        // 🚨 CRITICAL FIX: Ensure the refresh token matches the CURRENT active session
        // If they logged in somewhere else, currentSessionToken changed, killing this refresh token!
        if (user.currentSessionToken !== decoded.sessionToken) {
            return res.status(401).json({ success: false, message: 'Session invalidated by login on another device.' });
        }

        // Issue a fresh 15-minute access token
        const newToken = generateToken(user._id, user.role ? user.role._id : null, user.currentSessionToken);

        res.status(200).json({ success: true, token: newToken });
    } catch (error) {
        console.error('Token refresh failed:', error.message);
        res.status(403).json({ success: false, message: 'Invalid or expired refresh token. Please log in again.' });
    }
};

// @desc    Logout user & invalidate session
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        // Optional: If req.user is set by your auth middleware, you could clear the sessionToken here
        // await User.updateOne({ _id: req.user.id }, { currentSessionToken: null });

        res.status(200).json({
            success: true,
            message: 'Successfully logged out of the ERP system.'
        });
    } catch (error) {
        console.error("Logout Error:", error.message);
        res.status(500).json({ success: false, message: 'Server error during logout' });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('role')
            .populate('division');
        
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                division: user.division
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
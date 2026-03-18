const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // <-- This built-in library handles the session tokens

// Helper to generate JWT (Now includes the sessionToken!)
const generateToken = (id, role, sessionToken) => {
    return jwt.sign({ id, role, sessionToken }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({ name, email, password });

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

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

        // Generate a new random session token
        const newSessionToken = crypto.randomBytes(20).toString('hex');
        
        // Save the new token to the database
        user.currentSessionToken = newSessionToken;
        await user.save();

        res.status(200).json({
            success: true,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            token: generateToken(user._id, user.role, newSessionToken)
        });
    } catch (error) {
        // We added a console.log here so if it crashes again, the terminal will scream exactly why
        console.error("Login Crash:", error); 
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Logout user & invalidate session
// @route   POST /api/auth/logout
// @access  Private
exports.logoutUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { currentSessionToken: null });
        res.status(200).json({ success: true, message: 'Logged out securely.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); 

// Helper to generate JWT (Includes the sessionToken)
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

        // Note: Password hashing should ideally be done in a Mongoose pre-save hook, 
        // but if you aren't using one, make sure to hash it here like we did in userController!
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

        // 👇 FIX 1: Fetch the user and populate BOTH Role and Division
        const user = await User.findOne({ email })
            .populate('role')
            .populate('division'); 
        
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        // 👇 FIX 2: Generate and save the Session Token to prevent multi-device bugs
        const sessionToken = crypto.randomBytes(20).toString('hex');
        // ✅ THE ENTERPRISE WAY (Only touches the exact field you want)
        await User.updateOne({ _id: user._id }, { currentSessionToken: sessionToken });

        // Generate the JWT token using the helper
        const token = generateToken(user._id, user.role ? user.role._id : null, sessionToken);

        res.status(200).json({
            success: true,
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                // 🚨 THE CRITICAL FIX: Send the FULL objects, not just the names!
                role: user.role, 
                division: user.division 
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Logout user & invalidate session
// @route   POST /api/auth/logout
// @access  Private
// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
    try {
        // If you ever use HTTP-only cookies in the future, you would clear them here like this:
        // res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });

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
        // 👇 FIX 3: Populate BOTH Role and Division here as well
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
                // 🚨 CRITICAL FIX: Send the FULL objects back to React
                role: user.role,
                division: user.division
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
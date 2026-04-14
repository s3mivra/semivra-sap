const User = require('../models/User');
const bcrypt = require('bcryptjs');
// @desc    Get all users (excluding passwords)
// @route   GET /api/users
// @access  Private (Admin / Super Admin)
exports.getUsers = async (req, res) => {
    try {
        // 🏢 SILO LOCK: If they aren't God Mode, they only see users in their own branch!
        let query = {};
        if (req.user && req.user.role && req.user.role.level !== 100) {
            query.division = req.user.division;
        }

        const users = await User.find(query)
            .select('-password')
            .populate('role', 'name level permissions')
            .populate('division', 'divisionName divisionCode') // 👈 FIX: Semicolon removed here!
            .sort({ createdAt: -1 });
            
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update a user role
// @route   PUT /api/users/:id/role
// @access  Private (Super Admin)
exports.updateUserRole = async (req, res) => {
    try {
        const { roleId } = req.body; // Updated to expect an ObjectId, not a string
        
        const user = await User.findById(req.params.id).populate('role');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Safety Catch: Prevent the Super Admin from demoting themselves!
        if (user._id.toString() === req.user.id && user.role && user.role.level === 100) {
            return res.status(400).json({ success: false, message: 'You cannot demote your own Super Admin account.' });
        }

        user.role = roleId;
        await user.save();

        res.status(200).json({ success: true, message: `User role updated successfully!`, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private (Super Admin)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Create a new user/admin manually
// @route   POST /api/users
// @access  Private (Admin / Super Admin)
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, roleId, division } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ success: false, message: 'User already exists' });

        // 🚨 THE FIX: Hash the temporary password before saving!
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({ 
            name, 
            email, 
            password: hashedPassword, // 👈 Saved securely!
            role: roleId,
            division: division || null 
        });

        res.status(201).json({ success: true, message: 'User created successfully', data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
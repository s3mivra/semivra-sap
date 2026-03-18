const User = require('../models/User');

// @desc    Get all users (excluding passwords)
// @route   GET /api/users
// @access  Private (Super Admin)
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private (Super Admin)
// NEW: UPDATE USER ROLE (Super Admin Only)
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Safety Catch: Prevent the Super Admin from demoting themselves!
        if (user._id.toString() === req.user.id && role !== 'Super Admin') {
            return res.status(400).json({ success: false, message: 'You cannot demote your own Super Admin account.' });
        }

        user.role = role;
        await user.save();

        res.status(200).json({ success: true, message: `${user.name} is now a ${role}!`, data: user });
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
// @access  Private (Super Admin)
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({ name, email, password, role });

        res.status(201).json({ 
            success: true, 
            message: 'User created successfully',
            data: { _id: user._id, name: user.name, email: user.email, role: user.role } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
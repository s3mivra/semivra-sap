const User = require('../models/User');
const Role = require('../models/Role');

exports.initializeERP = async (req, res) => {
    try {
        // 1. THE LOCK: If even one user exists, abort immediately.
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'System is already initialized. Access denied.' 
            });
        }

        // 2. Create the Genesis Role (Super Admin)
        const superAdminRole = await Role.create({
            name: 'Super Admin',
            level: 100,
            // You can use a wildcard like 'all', or list out all explicit permissions
            permissions: ['manage_system', 'manage_users', 'view_everything'] 
        });

        // 3. Create the Genesis User
        const firstUser = await User.create({
            name: 'System Architect',
            email: 'admin@semivra.com', // Change this to your actual email
            password: 'supersecretpassword', // Remember to change this after logging in!
            role: superAdminRole._id,
            businessUnit: null, // Super Admins transcend Business Units
            department: null    // Super Admins transcend Departments
        });

        res.status(201).json({ 
            success: true, 
            message: 'ERP Initialized! The first Super Admin has been created.', 
            user: { email: firstUser.email, role: superAdminRole.name }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
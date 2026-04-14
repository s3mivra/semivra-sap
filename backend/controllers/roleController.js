const Role = require('../models/Role'); // Assuming you have a Role model

exports.getRoles = async (req, res) => {
    try {
        const roles = await Role.find().sort({ level: -1 });
        res.status(200).json({ success: true, data: roles });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createRole = async (req, res) => {
    try {
        const { name, level, permissions } = req.body;
        
        if (!name || !level) {
            return res.status(400).json({ success: false, message: "Role name and level are required." });
        }

        const role = await Role.create({ name, level, permissions: permissions || [] });
        res.status(201).json({ success: true, data: role });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: "A role with this name already exists." });
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        // Prevent deleting God Mode
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ success: false, message: "Role not found." });
        if (role.level === 100) return res.status(400).json({ success: false, message: "Cannot delete the Super Admin / God Mode role." });

        await Role.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Role deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
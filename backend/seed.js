const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs'); // 👈 1. IMPORT BCRYPT
const User = require('./models/User'); 
const Role = require('./models/Role'); 

dotenv.config({ path: './.env' }); 

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        await User.deleteMany();
        await Role.deleteMany(); 

        const superAdminRole = await Role.create({
            name: 'Super Admin',
            level: 100,
            permissions: [
                'view_sales', 'create_sales', 'edit_sales', 'delete_sales',
                'view_inventory', 'manage_inventory', 'transfer_inventory',
                'view_reports', 'manage_users', 'manage_system'
            ]
        });

        // 👇 2. MANUALLY HASH THE PASSWORD
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const superAdmin = new User({
            name: 'System Override',
            email: 'superadmin@system.com',
            password: hashedPassword, // 👈 3. USE THE HASHED PASSWORD
            role: superAdminRole._id 
        });

        await superAdmin.save();
        console.log('Super Admin Seeded Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedData();
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User'); // Path fixed!

dotenv.config({ path: './.env' }); // Path fixed!

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Seeding...');

        // Clear existing data
        await User.deleteMany();
        console.log('Old users cleared...');

        // Create Super Admin
        const superAdmin = new User({
            name: 'System Override',
            email: 'superadmin@system.com',
            password: 'password123',
            role: 'Super Admin'
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
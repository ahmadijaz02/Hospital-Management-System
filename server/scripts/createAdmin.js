const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const createAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital');
        console.log('Connected to MongoDB...');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@hospital.com' });
        
        if (existingAdmin) {
            console.log('Admin user already exists:', {
                id: existingAdmin._id,
                email: existingAdmin.email,
                role: existingAdmin.role
            });
            await mongoose.disconnect();
            return;
        }

        // Create admin user
        const admin = await User.create({
            name: 'Admin User',
            username: 'admin',
            email: 'admin@hospital.com',
            password: 'Admin@123',
            role: 'admin',
            isEmailVerified: true
        });

        console.log('Admin user created successfully:', {
            id: admin._id,
            email: admin.email,
            role: admin.role
        });

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the script
createAdmin(); 
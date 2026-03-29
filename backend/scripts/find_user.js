const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Connection error', error);
        process.exit(1);
    }
};

const findArjun = async () => {
    await connectDB();
    // Search for a user with "Arjun" in their name
    const users = await User.find({ name: { $regex: 'Arjun', $options: 'i' } });

    console.log(`Found ${users.length} users named "Arjun":`);
    users.forEach(u => {
        console.log(`- ${u.name} (ID: ${u._id}) - Role: ${u.role}`);
    });

    process.exit(0);
};

findArjun();

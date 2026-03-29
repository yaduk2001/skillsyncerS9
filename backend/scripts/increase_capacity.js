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

const increaseCapacity = async () => {
    await connectDB();
    const mentorId = '695f792823b5bcdd20b16bda'; // Salu Manoj (Grade A)

    const mentor = await User.findById(mentorId);
    if (mentor) {
        console.log(`Current Capacity for ${mentor.name}: ${mentor.mentorProfile.currentMentees} / ${mentor.mentorProfile.maxMentees}`);

        // Increase max entries to allow assignment
        mentor.mentorProfile.maxMentees = 10;
        await mentor.save();
        console.log(`Updated Capacity to: ${mentor.mentorProfile.maxMentees}`);
    } else {
        console.log('Mentor not found');
    }

    process.exit(0);
};

increaseCapacity();

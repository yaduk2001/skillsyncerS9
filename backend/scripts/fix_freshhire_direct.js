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

const fixBasedOnIds = async () => {
    await connectDB();

    const mentorId = '697eead53f4f3927bb335afa'; // Yadu
    const employerId = '68b3ff21744b20e9d509c742'; // freshhire

    console.log(`Checking Mentor: ${mentorId}`);
    const mentor = await User.findById(mentorId);

    if (mentor) {
        console.log(`Found Mentor: ${mentor.name}`);
        console.log(`Grade: ${mentor.mentorProfile?.grade}`);
        console.log(`Capacity: ${mentor.mentorProfile?.currentMentees} / ${mentor.mentorProfile?.maxMentees}`);

        if (mentor.mentorProfile.currentMentees >= (mentor.mentorProfile.maxMentees || 5)) {
            console.log('increasing capacity...');
            mentor.mentorProfile.maxMentees = 20; // boost it
            await mentor.save();
            console.log('Capacity updated.');
        }
    } else {
        console.log('Mentor NOT found by ID.');
    }

    process.exit(0);
};

fixBasedOnIds();

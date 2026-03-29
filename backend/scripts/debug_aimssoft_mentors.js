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

const checkAimssoftMentors = async () => {
    await connectDB();

    // 1. Aimssoft Company ID (Verified)
    const companyId = '68c0f7cd7e928c33bc2ccd14';
    console.log(`Checking Aimssoft Company ID: ${companyId}`);
    console.log(`Aimssoft Company ID: ${companyId}`);

    // 2. Find Mentors linked to this company
    const mentors = await User.find({
        $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
        'employeeProfile.companyId': companyId
    });

    console.log(`Found ${mentors.length} mentors for Aimssoft:`);

    mentors.forEach(m => {
        console.log(`- ${m.name} (Grade: ${m.mentorProfile?.grade})`);
        console.log(`  Mentees: ${m.mentorProfile?.currentMentees} / ${m.mentorProfile?.maxMentees || 5}`);
        console.log(`  Active: ${m.isActive}`);
        console.log('---');
    });

    process.exit(0);
};

checkAimssoftMentors();

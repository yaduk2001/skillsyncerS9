const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const verifyGrades = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected\n');

        const mentors = await User.find({
            $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
            isActive: true
        }).select('name email mentorProfile.grade mentorProfile.yearsOfExperience');

        console.log(`🔍 Found ${mentors.length} active mentors:\n`);

        mentors.forEach(m => {
            console.log(`👤 Name: ${m.name}`);
            console.log(`   Email: ${m.email}`);
            console.log(`   Experience: ${m.mentorProfile?.yearsOfExperience || 'N/A'}`);
            console.log(`   GRADE stored in DB: [ ${m.mentorProfile?.grade || 'NONE'} ]`); // The crucial part
            console.log('--------------------------------------------------');
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyGrades();

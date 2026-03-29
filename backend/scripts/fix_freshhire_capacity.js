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

const checkAndFixFreshhire = async () => {
    await connectDB();

    console.log('--- Checking Freshhire Mentors ---');

    // 1. Find Freshhire Company ID
    // We can find it via the mentor 'Yadu' if we know him, or just search employers
    const freshhireAdmin = await User.findOne({
        role: 'employer',
        'company.name': { $regex: 'freshhire', $options: 'i' }
    });

    if (!freshhireAdmin) {
        console.log('Freshhire employer not found!');
        // Fallback: search for Yadu and get his companyId
        const yadu = await User.findOne({ name: 'Yadu', role: 'mentor' });
        if (yadu) {
            console.log(`Found Yadu (Mentor). Company ID: ${yadu.employeeProfile?.companyId}`);
            await checkMentorsForCompany(yadu.employeeProfile?.companyId);
        } else {
            console.log('Yadu not found either.');
        }
        process.exit(0);
    }

    const companyId = freshhireAdmin._id;
    console.log(`Freshhire Company ID: ${companyId}`);
    await checkMentorsForCompany(companyId);

    process.exit(0);
};

const checkMentorsForCompany = async (companyId) => {
    const mentors = await User.find({
        $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
        'employeeProfile.companyId': companyId
    });

    console.log(`Found ${mentors.length} mentors for Freshhire:`);

    for (const m of mentors) {
        console.log(`- ${m.name} (Grade: ${m.mentorProfile?.grade})`);
        console.log(`  Mentees: ${m.mentorProfile?.currentMentees} / ${m.mentorProfile?.maxMentees || 5}`);

        // AUTO-FIX: Increase capacity if full
        if (m.mentorProfile && (m.mentorProfile.currentMentees >= (m.mentorProfile.maxMentees || 5))) {
            console.log('  >> Mentor is FULL. Increasing capacity...');
            m.mentorProfile.maxMentees = (m.mentorProfile.maxMentees || 5) + 5;
            await m.save();
            console.log(`  >> New Capacity: ${m.mentorProfile.maxMentees}`);
        }
    }
};

checkAndFixFreshhire();

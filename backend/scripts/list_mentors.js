const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(process.cwd(), 'backend/.env');
dotenv.config({ path: envPath });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        const mentors = await User.find({
            $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }]
        }).select('name company.name mentorProfile.grade');

        console.log('--- ALL MENTORS ---');
        mentors.forEach(m => {
            console.log(`Mentor: ${m.name} | Grade: ${m.mentorProfile?.grade} | CompName: "${m.company?.name}" | CompID: ${m.employeeProfile?.companyId}`);
        });
        console.log('-------------------');
    } catch (e) { console.error(e); }
    process.exit();
};
run();

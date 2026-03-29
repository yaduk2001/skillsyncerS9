const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    } catch (error) {
        process.exit(1);
    }
};

const checkHistory = async () => {
    await connectDB();
    const jobseekerId = '68f532910eaf75ca905168cf'; // Jishnu dev from previous debug

    console.log(`Checking history for Jobseeker: ${jobseekerId}`);

    const apps = await InternshipApplication.find({ jobseekerId }).populate('employerId');
    console.log(`Found ${apps.length} applications.`);

    for (const app of apps) {
        console.log(`- App [${app.status}] for ${app.employerId?.company?.name || app.employerId?.name} (Sim: ${app.employerId?._id})`);
        console.log(`  Result: ${app.result}, Score: ${app.score}`);
    }

    const user = await User.findById(jobseekerId).populate('profile.assignedMentor');
    if (user.profile?.assignedMentor) {
        const mentor = user.profile.assignedMentor;
        console.log(`Current Mentor: ${mentor.name}`);
        console.log(`Mentor Company ID: ${mentor.employeeProfile?.companyId}`);
        const mCompany = await User.findById(mentor.employeeProfile?.companyId);
        console.log(`Mentor Company: ${mCompany?.company?.name || mCompany?.name}`);
    } else {
        console.log('No mentor currently assigned.');
    }

    process.exit(0);
};

checkHistory();

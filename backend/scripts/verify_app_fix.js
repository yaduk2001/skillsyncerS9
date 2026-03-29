const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Load models BEFORE requiring utils
const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication');

// Now require the modified utils
const { allocateMentor } = require('../utils/mentorAssignment');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Connection error', error);
        process.exit(1);
    }
};

const verifyFixApplication = async () => {
    await connectDB();
    const jobseekerId = '68f532910eaf75ca905168cf'; // Jishnu

    // Find the freshhire application
    const app = await InternshipApplication.findOne({
        jobseekerId: jobseekerId,
        'internshipDetails.title': 'Python Developer' // Assuming this from screenshot... Or just latest
    }).sort({ updatedAt: -1 });

    if (!app) {
        console.log('Application not found');
        process.exit(0);
    }

    console.log(`APPLICATION: ${app._id}`);
    console.log(`Current MentorId in App: ${app.mentorId}`);

    // Trigger allocation passing this App ID
    // We need to pass Application ID as 4th arg
    console.log('Re-running allocation with Application ID...');
    const result = await allocateMentor(jobseekerId, null, null, app._id);
    console.log('Result:', result.success);

    // Verify
    const updatedApp = await InternshipApplication.findById(app._id);
    console.log(`Updated MentorId in App: ${updatedApp.mentorId}`);

    if (updatedApp.mentorId) {
        const m = await User.findById(updatedApp.mentorId);
        console.log(`Mentor Name: ${m.name}`);
        console.log(`Mentor Company ID: ${m.employeeProfile?.companyId}`);
        const mCompany = await User.findById(m.employeeProfile?.companyId);
        console.log(`Mentor Company Name: ${mCompany?.company?.name || mCompany?.name}`);
    }

    process.exit(0);
};

verifyFixApplication();

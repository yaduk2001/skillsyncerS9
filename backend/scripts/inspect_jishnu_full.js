const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication');
const InternshipPosting = require('../models/InternshipPosting'); // Required to prevent schema errors

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Connection error', error);
        process.exit(1);
    }
};

const inspectApps = async () => {
    await connectDB();
    const jobseekerId = '68f532910eaf75ca905168cf'; // Jishnu

    console.log(`Fetching applications for Jobseeker: ${jobseekerId}`);

    const apps = await InternshipApplication.find({ jobseekerId }).sort({ appliedAt: -1 });

    let output = `Found ${apps.length} applications (Raw DB Query):\n`;

    for (const app of apps) {
        output += '--------------------------------------------------\n';
        output += `App ID: ${app._id}\n`;
        output += `Title: ${app.internshipDetails?.title}\n`;
        output += `Status: "${app.status}"\n`;
        output += `Employer ID: ${app.employerId?._id || app.employerId}\n`;
        // Must populate to get details below
        await app.populate('employerId');
        output += `Employer Name: ${app.employerId?.name}\n`;
        output += `Employer Role: ${app.employerId?.role}\n`;
        output += `Employer Company: ${app.employerId?.company?.name}\n`;
        output += `Mentor ID (Raw): ${app.mentorId}\n`;

        // Check if mentor exists
        if (app.mentorId) {
            const mentor = await User.findById(app.mentorId);
            if (mentor) {
                output += `> Mentor Found: ${mentor.name} (Company: ${mentor.employeeProfile?.companyId})\n`;
            } else {
                output += `> Mentor ID present but User NOT found!\n`;
            }
        }
    }

    const fs = require('fs');
    fs.writeFileSync('inspect_direct.txt', output);
    console.log('Written to inspect_direct.txt');
    process.exit(0);
};

inspectApps();

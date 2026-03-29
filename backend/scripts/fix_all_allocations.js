const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication');
const InternshipPosting = require('../models/InternshipPosting');
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

const fixAllocations = async () => {
    await connectDB();
    const jobseekerId = '6972fd8bb1c7652f20be4793'; // Arjun

    // Find all applications that are NOT rejected or withdrawn
    const apps = await InternshipApplication.find({
        jobseekerId,
        status: { $nin: ['rejected', 'withdrawn'] }
    }).populate('employerId');

    let logBuffer = `Found ${apps.length} potentially relevant applications for Jishnu.\n`;

    for (const app of apps) {
        logBuffer += `\nPROCESSING App: ${app.internshipDetails?.title} (${app.employerId?.company?.name})\n`;
        logBuffer += `Current Mentor: ${app.mentorId}\n`;

        // Force allocation
        const result = await allocateMentor(jobseekerId, null, null, app._id);

        logBuffer += `Allocation Result: ${result.success ? 'SUCCESS' : 'FAILED'}\n`;
        if (result.mentor) {
            logBuffer += `Assigned Mentor: ${result.mentor.name} (ID: ${result.mentor.id})\n`;
        } else {
            logBuffer += `Message: ${result.message}\n`;
        }
    }

    fs.writeFileSync('fix_log.txt', logBuffer);
    console.log('Log written to fix_log.txt');
    process.exit(0);
};

fixAllocations();

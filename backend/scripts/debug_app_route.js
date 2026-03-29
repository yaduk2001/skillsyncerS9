const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const InternshipPosting = require('../models/InternshipPosting');
const InternshipApplication = require('../models/InternshipApplication');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Connection error', error);
        process.exit(1);
    }
};

const debugRouteCalls = async () => {
    await connectDB();
    const jobseekerId = '68f532910eaf75ca905168cf'; // Jishnu

    console.log('Calling InternshipApplication.getApplicationsForJobseeker...');
    const apps = await InternshipApplication.getApplicationsForJobseeker(jobseekerId);

    const fs = require('fs');
    let output = `Found ${apps.length} applications.\n`;

    apps.forEach(app => {
        const title = app.internshipId?.title || app.internshipDetails?.title || 'NoTitle';
        const company = app.employerId?.company?.name || app.employerId?.name || 'NoCompany';
        const mentorName = app.mentorId ? app.mentorId.name : 'NULL';
        const mentorCompany = app.mentorId?.employeeProfile?.companyId || 'N/A';
        output += `[APP] ${title} | ${company} | Mentor: ${mentorName} (Co: ${mentorCompany})\n`;
    });

    fs.writeFileSync('debug_output.txt', output);
    console.log('Output written to debug_output.txt');
    process.exit(0);
};

debugRouteCalls();

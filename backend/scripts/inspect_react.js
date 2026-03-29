const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

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

const inspectReactApp = async () => {
    await connectDB();
    const jobseekerId = '68f532910eaf75ca905168cf';

    const app = await InternshipApplication.findOne({
        jobseekerId: jobseekerId,
        'internshipDetails.title': 'React Developer'
    });

    if (!app) {
        console.log('React Developer App NOT FOUND for this user.');
    } else {
        console.log('Found React Developer App:');
        console.log(`ID: ${app._id}`);
        console.log(`Status: >${app.status}< (Type: ${typeof app.status})`);
        console.log(`Jobseeker ID: ${app.jobseekerId}`);
    }

    process.exit(0);
};

inspectReactApp();

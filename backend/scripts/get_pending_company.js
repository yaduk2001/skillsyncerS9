const mongoose = require('mongoose');
const InternshipApplication = require('../models/InternshipApplication');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    const apps = await InternshipApplication.find({
        $or: [{ status: 'selected' }, { result: 'Passed' }],
        mentorId: null
    }).populate('internshipId', 'companyName').populate('employerId', 'company.name');

    if (apps.length > 0) {
        const app = apps[0];
        const company = app.internshipId?.companyName || app.employerId?.company?.name;
        console.log(`PENDING_COMPANY: "${company}"`);
    } else {
        console.log('NO_PENDING_APPS');
    }
    process.exit();
};
run();

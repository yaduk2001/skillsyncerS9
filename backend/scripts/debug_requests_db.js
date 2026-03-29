const mongoose = require('mongoose');
const User = require('../models/User');
const MentorRequest = require('../models/MentorRequest');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);

        // 1. List all Mentor Requests
        const requests = await MentorRequest.find({}).sort({ createdAt: -1 }).limit(5);
        console.log(JSON.stringify({
            requests: requests.map(r => ({
                id: r._id,
                status: r.status,
                email: r.employeeEmail,
                companyId: r.companyId,
                yearsOfExperience: r.yearsOfExperience
            }))
        }, null, 2));

        // 2. List all Employers/Companies
        const employers = await User.find({ role: { $in: ['employer', 'company'] } }).limit(5);
        console.log(JSON.stringify({
            employers: employers.map(u => ({
                id: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                companyName: u.company?.name || 'N/A'
            }))
        }, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();

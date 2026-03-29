const mongoose = require('mongoose');
const User = require('../models/User');
const MentorRequest = require('../models/MentorRequest');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const checkRequests = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        // Find requests created in the last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const requests = await MentorRequest.find({
            createdAt: { $gte: oneDayAgo }
        }).sort({ createdAt: -1 }).limit(10);

        console.log(`\n🔍 Found ${requests.length} requests in the last 24 hours:\n`);

        requests.forEach(req => {
            console.log(`- [${req.status}] ${req.employeeName} (${req.employeeEmail})`);
            console.log(`  Created: ${req.createdAt}`);
            console.log(`  Company: ${req.companyId}`);
            console.log(`  ID: ${req._id}`);
            console.log('---');
        });

        if (requests.length === 0) {
            console.log('❌ No recent requests found. Input is likely blocked at Frontend or API layer.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkRequests();

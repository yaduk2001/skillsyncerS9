const axios = require('axios');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const API_URL = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') + '/api' : 'http://localhost:5003/api';

// You need a valid company token to test this.
// Since we don't have one handy, we might need to login as a company first.
// For now, let's assume we can get one or we'll create a script that logs in a company user.

const testSubmission = async () => {
    try {
        console.log('🔄 Attempting to login as a company...');
        // We need a known company user. Let's try to find one or fail if we can't.
        // Actually, let's use the login endpoint if we know credentials. 
        // If not, we might need to query the DB to mock the request context if we were running unrelated to the server.
        // But to hit the API, we need a token.

        // Let's rely on the user providing a token or we simulate the DB operation directly?
        // Simulating DB operation directly is easier to debug logic errors.
        // Hitting API is better for "integration" testing.

        // Let's go with DB simulation first to check the SCHEMAS and LOGIC.
        // We will mock the req/res objects and call the route handler function? 
        // No, that's hard because of imports.

        // Let's try to create a script that connects to DB and calls the logic manually.
        // But the route logic is in routes/mentor.js.

        // Let's create a "create_test_request.js" that acts like the route.
        const mongoose = require('mongoose');
        const User = require('../models/User');
        const MentorRequest = require('../models/MentorRequest');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        // Find a company user
        const company = await User.findOne({ role: { $in: ['employer', 'company'] } });
        if (!company) {
            console.error('❌ No company user found to test with.');
            process.exit(1);
        }
        console.log(`ℹ️  Using Company: ${company.name} (${company._id})`);

        // Mock Payload
        const payload = {
            companyId: company._id,
            requestedBy: company._id,
            employeeName: 'Test Employee 3',
            employeeEmail: 'testemployee3@example.com',
            employeePhone: '9876543212',
            employeePosition: 'Developer',
            employeeDepartment: 'Engineering',
            justification: 'Testing submission logic',
            expertise: ['React', 'Node'],
            yearsOfExperience: '3-5'
        };

        console.log('🔄 Attempting to create MentorRequest directly...');

        // Check pre-conditions (like logic in route)
        const existingUser = await User.findOne({ email: payload.employeeEmail });
        if (existingUser && existingUser.role === 'mentor') {
            console.log('⚠️  User is already a mentor.');
        }

        const existingRequest = await MentorRequest.findOne({ employeeEmail: payload.employeeEmail, status: 'pending' });
        if (existingRequest) {
            console.log('⚠️  Pending request already exists.');
            // Delete it to allow test
            await MentorRequest.deleteOne({ _id: existingRequest._id });
            console.log('🗑️  Deleted existing pending request.');
        }

        const newRequest = await MentorRequest.create(payload);
        console.log('✅  MentorRequest created successfully:', newRequest._id);

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
    }
};

testSubmission();

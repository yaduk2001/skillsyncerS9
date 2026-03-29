const mongoose = require('mongoose');
const User = require('../models/User');
const MentorRequest = require('../models/MentorRequest');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        // 1. Find or create a company user
        let company = await User.findOne({ role: 'company' });
        if (!company) {
            console.log('Creating test company...');
            company = await User.create({
                name: 'Test Company',
                email: 'testcompany@example.com',
                password: 'password123',
                role: 'company',
                company: { name: 'Test Corp', industry: 'technology' }
            });
        }
        console.log(`Using company: ${company.name} (${company.email}) ID: ${company._id}`);

        // 2. Simulate Request Payload
        const payload = {
            companyId: company._id, // In real route this comes from req.user._id
            requestedBy: company._id,
            employeeName: 'John Doe',
            employeeEmail: `john.doe.${Date.now()}@testcorp.com`,
            employeePhone: '9876543210',
            employeePosition: 'Senior Dev',
            employeeDepartment: 'Engineering',
            justification: 'Expert in React',
            yearsOfExperience: '5-10',
            expertise: ['React', 'Node.js']
        };

        // 3. Create Request (Simulating route logic)
        console.log('Creating MentorRequest...');
        const request = await MentorRequest.create(payload);

        // 4. Verify Fetching (Populate)
        console.log('Fetching and populating request...');
        const fetchedRequest = await MentorRequest.findById(request._id)
            .populate('companyId', 'name email company.name')
            .populate('requestedBy', 'name email');

        console.log('--- Fetched Request Details ---');
        console.log(`ID: ${fetchedRequest._id}`);
        console.log(`Employee: ${fetchedRequest.employeeName} (${fetchedRequest.employeeEmail})`);

        // This is the key part the user asked for: fetching company details from DB
        console.log(`Company Name (Populated): ${fetchedRequest.companyId.company?.name || fetchedRequest.companyId.name}`);
        console.log(`Company Email (Populated): ${fetchedRequest.companyId.email}`);

        if (fetchedRequest.companyId.email === company.email) {
            console.log('SUCCESS: Company email correctly fetched from database via reference.');
        } else {
            console.error('FAILURE: Company email mismatch.');
        }

        // Cleanup
        await MentorRequest.findByIdAndDelete(request._id);
        console.log('Cleanup done.');

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();

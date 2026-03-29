const mongoose = require('mongoose');
const User = require('../models/User');
const MentorRequest = require('../models/MentorRequest'); // Ensure this model exists
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // 1. Find a test employer
        let employer = await User.findOne({ role: 'employer' });
        if (!employer) {
            employer = await User.findOne({ role: 'company' });
        }

        if (!employer) {
            console.log('No employer found. Creating one...');
            employer = await User.create({
                name: 'Test Company',
                email: 'testcompany@example.com',
                password: 'password123',
                role: 'employer',
                company: {
                    name: 'Test Company Inc',
                    industry: 'Technology',
                    description: 'Test description',
                    location: 'Remote'
                }
            });
        }
        console.log('Using Employer:', employer.email, employer._id);

        // 2. Define payload
        // Ensure email is unique or clean up previous request
        const testEmployeeEmail = 'testemployee_req@example.com';

        await MentorRequest.deleteMany({ employeeEmail: testEmployeeEmail });

        const payload = {
            employeeName: 'Test Employee for Request',
            employeeEmail: testEmployeeEmail,
            employeePhone: '9876543210',
            employeePosition: 'Senior Developer',
            employeeDepartment: 'Engineering',
            justification: 'Excellent technical skills and leadership qualities. Proven track record.',
            expertise: ['JavaScript', 'React'],
            yearsOfExperience: '5-10'
        };

        console.log('Simulating Request Payload:', payload);

        // 3. Simulate Logic from backend/routes/mentor.js POST /request
        // Note: We are running this as a script, so we'll invoke the logic directly or rely on the fact that if this logic passes, the route likely should too unless it's a middleware issue.
        // For better testing, let's replicate the logic exactly.

        // Validation
        if (!payload.employeeName || !payload.employeeEmail || !payload.employeePhone ||
            !payload.employeePosition || !payload.employeeDepartment || !payload.justification ||
            !payload.yearsOfExperience) {
            throw new Error('Validation failed: Missing fields');
        }

        // Check existing user
        const existingUser = await User.findOne({ email: payload.employeeEmail });
        if (existingUser && (existingUser.role === 'mentor' || (existingUser.secondaryRoles && existingUser.secondaryRoles.includes('mentor')))) {
            throw new Error('Employee is already a mentor');
        }

        // Check existing request
        const existingRequest = await MentorRequest.findOne({
            employeeEmail: payload.employeeEmail,
            status: 'pending'
        });
        if (existingRequest) {
            throw new Error('Pending request already exists');
        }

        // Create
        const mentorRequest = await MentorRequest.create({
            companyId: employer._id,
            requestedBy: employer._id,
            employeeName: payload.employeeName,
            employeeEmail: payload.employeeEmail.toLowerCase(),
            employeePhone: payload.employeePhone,
            employeePosition: payload.employeePosition,
            employeeDepartment: payload.employeeDepartment,
            justification: payload.justification,
            expertise: payload.expertise,
            yearsOfExperience: payload.yearsOfExperience
        });

        console.log('SUCCESS: Mentor Request Created:', mentorRequest._id);

        // Cleanup
        await MentorRequest.deleteOne({ _id: mentorRequest._id });
        console.log('Cleaned up test request.');

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();

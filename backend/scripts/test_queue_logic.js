const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Load models first
const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication');
const InternshipPosting = require('../models/InternshipPosting');

// Load utils conservatively
let mentorAssignment;
try {
    mentorAssignment = require('../utils/mentorAssignment');
    console.log('Loaded mentorAssignment keys:', Object.keys(mentorAssignment));
} catch (e) {
    console.error('Failed to require mentorAssignment:', e);
    process.exit(1);
}

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const runTest = async () => {
    await connectDB();

    let jobseeker, employer, internship, application;

    try {
        console.log('--- STARTING STRICT MENTOR ASSIGNMENT TEST ---');

        if (typeof mentorAssignment.assignMentorToJobSeeker !== 'function') {
            throw new Error('assignMentorToJobSeeker is NOT a function. Code loaded incorrectly.');
        }

        // 1. Create a dummy Employer (Company) with NO Mentors
        const companyName = 'TestEmptyCompany_' + Date.now();
        employer = await User.create({
            name: companyName,
            email: `employer_${Date.now()}@test.com`,
            password: 'password123',
            role: 'employer',
            company: { name: companyName },
            isEmailVerified: true
        });
        console.log(`Step 1: Created Employer '${companyName}' (ID: ${employer._id})`);

        // 2. Create a dummy Jobseeker
        jobseeker = await User.create({
            name: 'Test Jobseeker',
            email: `jobseeker_${Date.now()}@test.com`,
            password: 'password123',
            role: 'jobseeker',
            isEmailVerified: true
        });
        console.log(`Step 2: Created Jobseeker (ID: ${jobseeker._id})`);

        // 3. Create an Internship Posting
        internship = await InternshipPosting.create({
            employerId: employer._id,
            companyName: companyName,
            title: 'Test Internship',
            category: 'Software Development',
            description: 'Test Description',
            skillsRequired: ['Node.js'],
            status: 'active'
        });
        console.log(`Step 3: Created Internship (ID: ${internship._id})`);

        // 4. Create an Application and select it
        application = await InternshipApplication.create({
            internshipId: internship._id,
            jobseekerId: jobseeker._id,
            employerId: employer._id,
            status: 'selected',
            personalDetails: { // Required fields
                fullName: 'Test Jobseeker',
                dateOfBirth: new Date('2000-01-01'),
                gender: 'Male',
                contactNumber: '1234567890',
                emailAddress: jobseeker.email,
            },
            educationDetails: {
                highestQualification: 'B.Tech',
                institutionName: 'Test Uni',
                yearOfGraduation: 2024,
                cgpaPercentage: '8.5'
            },
            declarations: {
                informationTruthful: true,
                consentToShare: true
            },
            additionalInfo: {
                whyJoinInternship: 'Test',
                resumeUrl: 'http://test.com/resume.pdf'
            }
        });
        console.log(`Step 4: Created 'Selected' Application (ID: ${application._id})`);

        // 5. Attempt Mentor Assignment (should FAIL to assign and QUEUE instead)
        console.log('Step 5: Attempting Grade A assignment...');

        // Use the function from the object explicitly
        const result = await mentorAssignment.assignMentorToJobSeeker(jobseeker._id, 'A', 'Software Development');

        console.log('\n--- RESULT ---');
        console.log('Success:', result.success);
        console.log('Mentor Assigned:', result.mentorAssigned);
        console.log('Queued:', result.queued);
        console.log('Message:', result.message);

        if (result.queued === true && result.mentorAssigned === false) {
            console.log('\n✅ TEST PASSED: Jobseeker was correctly queued because no same-company mentor was found.');
            // Double check profile
            const updatedUser = await User.findById(jobseeker._id);
            if (updatedUser.profile.assignmentQueue && updatedUser.profile.assignmentQueue.status === 'pending') {
                console.log('✅ Queue data verified in database.');
            } else {
                console.log('❌ Queue data MISSING in database.');
            }
        } else {
            console.log('\n❌ TEST FAILED: Unexpected result.');
        }

    } catch (error) {
        console.error('Test Execution Error:', error);
    } finally {
        // Cleanup
        if (application) await InternshipApplication.findByIdAndDelete(application._id);
        if (internship) await InternshipPosting.findByIdAndDelete(internship._id);
        if (jobseeker) await User.findByIdAndDelete(jobseeker._id);
        if (employer) await User.findByIdAndDelete(employer._id);
        console.log('\nCleaned up test data.');
        mongoose.connection.close();
        process.exit();
    }
};

runTest();

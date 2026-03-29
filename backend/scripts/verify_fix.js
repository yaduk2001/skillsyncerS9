const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Load models BEFORE requiring utils
const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication'); // Needed for findJobseekerCompany

// Now require the modified utils
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

const verifyFix = async () => {
    await connectDB();
    const jobseekerId = '68f532910eaf75ca905168cf'; // Jishnu dev

    console.log(`\n--- VERIFYING FIX FOR JISHNU (${jobseekerId}) ---`);

    // Check initial state
    const userBefore = await User.findById(jobseekerId).populate('profile.assignedMentor');
    const mentorBefore = userBefore.profile?.assignedMentor;
    console.log('BEFORE Re-allocation:');
    if (mentorBefore) {
        console.log(`  Mentor: ${mentorBefore.name} (CompanyID: ${mentorBefore.employeeProfile?.companyId})`);
    } else {
        console.log('  Mentor: None');
    }

    // Trigger Allocation (relying on findJobseekerCompany logic)
    console.log('\nRunning allocateMentor()...');
    const result = await allocateMentor(jobseekerId);

    console.log('\nResult:', JSON.stringify(result, null, 2));

    // Check final state
    const userAfter = await User.findById(jobseekerId).populate('profile.assignedMentor');
    const mentorAfter = userAfter.profile?.assignedMentor;
    console.log('\nAFTER Re-allocation:');
    if (mentorAfter) {
        console.log(`  Mentor: ${mentorAfter.name} (CompanyID: ${mentorAfter.employeeProfile?.companyId})`);
        if (mentorBefore && mentorAfter._id.toString() !== mentorBefore._id.toString()) {
            console.log('  SUCCESS -> Mentor changed!');
        } else if (result.message.includes('Queue')) {
            console.log('  SUCCESS -> Moved to Queue (No mentor available in correct company).');
        } else if (mentorBefore && mentorAfter._id.toString() === mentorBefore._id.toString()) {
            console.log('  WARNING -> Mentor stayed same (Did verify fix work?)');
        }
    } else {
        if (result.message.includes('Queue')) {
            console.log('  SUCCESS -> User moved to Queue (Pending status)');
        } else {
            console.log('  Mentor: None');
        }
    }

    process.exit(0);
};

verifyFix();

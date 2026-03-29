console.log('Script started');
try {
    const mongoose = require('mongoose');
    const dotenv = require('dotenv');
    console.log('Modules loaded');

    // Load env
    const result = dotenv.config({ path: '../.env' });
    if (result.error) {
        console.log('Error loading .env, trying current dir');
        dotenv.config();
    }

    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');

    const User = require('../models/User');
    const InternshipApplication = require('../models/InternshipApplication');

    const connectDB = async () => {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                family: 4,
            });
            console.log('MongoDB Connected');
        } catch (error) {
            console.error('Connection error', error);
            process.exit(1);
        }
    };

    const debug = async () => {
        await connectDB();

        console.log('--- DEBUGGING MENTOR ALLOCATION ---');

        // 1. Find Mentor "Salu Manoj" (Case insensitive search just in case)
        const mentor = await User.findOne({ name: { $regex: 'Salu Manoj', $options: 'i' } });
        if (!mentor) {
            console.log('Mentor Salu Manoj not found');
            // List all mentors
            /*
            const mentors = await User.find({ role: 'mentor' }).limit(5);
            console.log('Some mentors:', mentors.map(m => m.name));
            */
        } else {
            console.log('Mentor: Salu Manoj');
            console.log('  ID:', mentor._id);
            console.log('  Email:', mentor.email);
            console.log('  Grade:', mentor.mentorProfile?.grade);

            // Check employee profile
            if (mentor.employeeProfile) {
                console.log('  EmployeeProfile CompanyId:', mentor.employeeProfile.companyId);
                if (mentor.employeeProfile.companyId) {
                    const company = await User.findById(mentor.employeeProfile.companyId);
                    console.log('    Linked Company Name:', company ? (company.company?.name || company.name) : 'Not Found');
                }
            } else {
                console.log('  EmployeeProfile: Missing/Null');
            }
        }

        // 2. Find Company "Freshhirre"
        const freshhire = await User.findOne({
            $or: [
                { name: { $regex: 'fresh', $options: 'i' } },
                { 'company.name': { $regex: 'fresh', $options: 'i' } }
            ],
            role: { $in: ['company', 'employer'] }
        });
        console.log('\nCompany (Fresh...):', freshhire ? (freshhire.company?.name || freshhire.name) : 'Not Found');
        if (freshhire) {
            console.log('  ID:', freshhire._id);
        }

        // 3. Find Company "Aimsioft"
        const aimsioft = await User.findOne({
            $or: [
                { name: { $regex: 'aims', $options: 'i' } },
                { 'company.name': { $regex: 'aims', $options: 'i' } }
            ],
            role: { $in: ['company', 'employer'] }
        });
        console.log('\nCompany (Aims...):', aimsioft ? (aimsioft.company?.name || aimsioft.name) : 'Not Found');
        if (aimsioft) {
            console.log('  ID:', aimsioft._id);
        }

        // 4. Find recent Jobseeker application
        console.log('\nRecent Passed Applications (Last 5):');
        const recentApps = await InternshipApplication.find({ result: 'Passed' })
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('jobseekerId', 'name email profile')
            .populate('employerId', 'name company');

        for (const app of recentApps) {
            if (!app.jobseekerId) continue;
            console.log(`- Jobseeker: ${app.jobseekerId.name} (ID: ${app.jobseekerId._id})`);
            console.log(`  App ID: ${app._id}`);
            console.log(`  Employer (from Application): ${app.employerId?.company?.name || app.employerId?.name}`);
            console.log(`  Employer ID: ${app.employerId?._id}`);

            const assignedMentorId = app.jobseekerId.profile?.assignedMentor;
            console.log(`  Assigned Mentor ID in Profile: ${assignedMentorId}`);

            if (assignedMentorId) {
                const assignedMentor = await User.findById(assignedMentorId);
                if (assignedMentor) {
                    console.log(`  -> Mentor Name: ${assignedMentor.name}`);
                    if (assignedMentor.employeeProfile?.companyId) {
                        const mCompany = await User.findById(assignedMentor.employeeProfile.companyId);
                        console.log(`  -> Mentor's Company: ${mCompany?.company?.name || mCompany?.name}`);
                        console.log(`  -> Mentor's Company ID: ${assignedMentor.employeeProfile.companyId}`);

                        const isMatch = app.employerId && app.employerId._id.toString() === assignedMentor.employeeProfile.companyId.toString();
                        console.log(`  -> Allocation Correct? ${isMatch ? 'YES' : 'NO'}`);

                        if (!isMatch) {
                            console.log('     *** BUG DETECTED: CROSS-COMPANY ASSIGNMENT ***');
                        }
                    } else {
                        console.log(`  -> Mentor has NO Company ID.`);
                    }
                } else {
                    console.log(`  -> Mentor User Not Found (ID: ${assignedMentorId})`);
                }
            } else {
                console.log('  No mentor assigned yet.');
            }
            console.log('---');
        }

        process.exit(0);
    };

    debug();

} catch (e) {
    console.error('Initial Error:', e);
}

const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();
const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    } catch (error) {
        process.exit(1);
    }
};

const inspect = async () => {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        await connectDB();
        log('--- ALLOCATION MISMATCH INSPECTION ---');

        // 1. Find Salu Manoj
        const mentor = await User.findOne({
            $or: [
                { email: 'salumanoj2026@mca.ajce.in' },
                { name: { $regex: 'Salu Manoj', $options: 'i' } }
            ]
        });

        if (!mentor) {
            log('Mentor Salu Manoj not found.');
            fs.writeFileSync('debug_allocation.txt', output);
            process.exit(0);
        }

        log(`Mentor: ${mentor.name} (ID: ${mentor._id})`);
        log(`Mentor Role: ${mentor.role}`);
        log(`Mentor Company ID (EmployeeProfile): ${mentor.employeeProfile?.companyId}`);

        let mentorCompanyName = 'Unknown';
        if (mentor.employeeProfile?.companyId) {
            const mentorCompany = await User.findById(mentor.employeeProfile.companyId);
            mentorCompanyName = mentorCompany?.company?.name || mentorCompany?.name;
            log(`Mentor Company Name: ${mentorCompanyName} (ID: ${mentorCompany?._id})`);
        } else {
            log('Mentor has NO LINKED COMPANY.');
        }

        // 2. Find Jobseekers assigned to this mentor
        const jobseekers = await User.find({ 'profile.assignedMentor': mentor._id });
        log(`\nFound ${jobseekers.length} jobseekers assigned to this mentor.`);

        for (const js of jobseekers) {
            log(`\nChecking Jobseeker: ${js.name} (ID: ${js._id})`);

            // 3. Find their successful application
            const app = await InternshipApplication.findOne({
                jobseekerId: js._id,
                result: 'Passed'
            }).populate('employerId');

            if (app) {
                log(`  Passed Application found (ID: ${app._id}):`);
                log(`  - Title: ${app.internshipDetails?.title}`);
                log(`  - Company Name in Details: ${app.internshipDetails?.companyName}`); // Check this!

                const appEmployerName = app.employerId?.company?.name || app.employerId?.name;
                const appEmployerId = app.employerId?._id;

                log(`  - Employer Name (linked User): ${appEmployerName}`);
                log(`  - Employer ID (linked User): ${appEmployerId}`);

                const isMatch = app.employerId?._id.toString() === mentor.employeeProfile?.companyId?.toString();
                log(`  - MATCHES MENTOR COMPANY? ${isMatch ? 'YES' : 'NO'}`);

                if (!isMatch) {
                    log('  *** MISMATCH DETECTED ***');
                    log(`  Mentor Company: ${mentorCompanyName}`);
                    log(`  App Employer: ${appEmployerName}`);
                } else {
                    log('  Allocation seems logic-compliant (Ids match).');
                    if (app.internshipDetails?.companyName !== mentorCompanyName && app.internshipDetails?.companyName) {
                        log(`  *** CONTENT MISMATCH ***`);
                        log(`  Application says company is "${app.internshipDetails.companyName}" but ID links to "${mentorCompanyName}"`);
                    }
                }
            } else {
                log('  No Passed Application found for this jobseeker.');
            }
        }

    } catch (err) {
        log('Script Error: ' + err);
    }

    fs.writeFileSync('debug_allocation.txt', output);
    process.exit(0);
};

inspect();

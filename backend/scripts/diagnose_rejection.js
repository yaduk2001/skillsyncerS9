const mongoose = require('mongoose');
const User = require('../models/User');
// Register models
const InternshipPosting = require('../models/InternshipPosting');
const InternshipApplication = require('../models/InternshipApplication'); // Ensure this is loaded
const { extractPostingCriteria, extractApplicant, computeMatchScore } = require('../utils/matching');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
    try {
        const conn = await mongoose.connect(MONGODB_URI);
        console.log(`Connected to DB: ${conn.connection.name}`);

        // 1. Count
        const appCount = await InternshipApplication.countDocuments({});
        console.log(`Total Applications: ${appCount}`);

        if (appCount === 0) {
            console.log('No applications found.');
            return;
        }

        // 2. List Raw IDs and Status
        const allApps = await InternshipApplication.find({})
            .sort({ appliedAt: -1 })
            .limit(10)
            .lean(); // Use lean to get POJOs

        console.log('--- Recent Applications (Raw) ---');
        allApps.forEach(a => {
            console.log(`ID: ${a._id}, Status: ${a.status}, JobSeeker: ${a.jobseekerId}, Internship: ${a.internshipId}`);
        });

        // 3. Pick one to Analysis
        // Prefer Auto-Rejected
        let targetAppId = allApps.find(a => a.status === 'Auto-Rejected')?._id;
        if (!targetAppId) {
            console.log('No Auto-Rejected found in top 10. Checking all...');
            const autoRejected = await InternshipApplication.findOne({ status: 'Auto-Rejected' }).sort({ appliedAt: -1 });
            if (autoRejected) targetAppId = autoRejected._id;
        }

        if (!targetAppId) {
            console.log('No specific Auto-Rejected application found in DB. Using the most recent one.');
            targetAppId = allApps[0]._id;
        }

        console.log(`\nAnalyzing App ID: ${targetAppId}`);

        // Manual Fetching to identify which part fails if any
        const app = await InternshipApplication.findById(targetAppId);
        const jobseeker = await User.findById(app.jobseekerId);
        const internship = await InternshipPosting.findById(app.internshipId);

        if (!jobseeker) {
            console.error(`Jobseeker not found for ID: ${app.jobseekerId}`);
        }
        if (!internship) {
            console.error(`Internship not found for ID: ${app.internshipId}`);
        }

        if (jobseeker && internship) {
            analyze(app, jobseeker, internship);
        } else {
            console.error('Cannot proceed with analysis due to missing related documents.');
        }

    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    } finally {
        await mongoose.disconnect();
    }
}

function analyze(application, jobseeker, internship) {
    console.log(`Analyzing: ${jobseeker.name} -> ${internship.title}`);

    // Extraction
    const criteria = extractPostingCriteria(internship);
    const applicant = extractApplicant(jobseeker.profile, jobseeker, application);

    // Computation
    const result = computeMatchScore(criteria, applicant);

    const matchDebug = {
        ApplicationId: application._id,
        CandidateName: jobseeker.name,
        JobTitle: internship.title,
        JobDomain: criteria.domain,
        ApplicantDomain: applicant.domain,
        JobSkills: criteria.skills,
        ApplicantSkills: applicant.skills,
        ApplicantEducation: applicant.educationStrings,
        JobQualifications: criteria.qualifications,
        RequiredCerts: criteria.certifications,
        ApplicantCerts: applicant.certifications,
        Score: result.score,
        Status: application.status,
        CalculatedStatus: result.decision,
        Breakdown: result
    };

    fs.writeFileSync('diagnosis.json', JSON.stringify(matchDebug, null, 2));
    console.log('Diagnosis written to diagnosis.json');
}

run();

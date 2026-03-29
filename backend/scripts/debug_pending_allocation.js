const mongoose = require('mongoose');
const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication');
const InternshipPosting = require('../models/InternshipPosting');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(process.cwd(), 'backend/.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env:', result.error);
} else {
    console.log('.env keys loaded:', Object.keys(result.parsed || {}));
}

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) throw new Error('MONGODB_URI is undefined in .env');
        console.log('Attempting to connect with URI length:', uri.length);
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err.message);
        process.exit(1);
    }
};

const debugPending = async () => {
    await connectDB();

    try {
        console.log('\n--- Checking Applications Pending Allocation ---');
        // Find applications that passed or are selected but have no mentorId
        const pendingApps = await InternshipApplication.find({
            $or: [{ status: 'selected' }, { result: 'Passed' }],
            mentorId: null
        }).populate('jobseekerId', 'name email profile.grade')
            .populate('employerId', 'name company.name')
            .populate('internshipId', 'title companyName');

        console.log(`Found ${pendingApps.length} pending applications.`);

        for (const app of pendingApps) {
            console.log(`\nApplication ID: ${app._id}`);
            console.log(`Jobseeker: ${app.jobseekerId?.name} (Grade: ${app.jobseekerId?.profile?.grade || 'N/A'})`);

            const companyName = app.internshipId?.companyName || app.employerId?.company?.name;
            console.log(`Target Company: "${companyName}"`);

            if (!companyName) {
                console.log('❌ No company name found on internship/employer!');
                continue;
            }

            const grade = app.jobseekerId?.profile?.grade || 'A'; // Default to A for check

            // Check available mentors in this company
            const mentors = await User.find({
                $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
                isActive: true,
                'company.name': companyName
            }).select('name email mentorProfile.grade mentorProfile.currentMentees mentorProfile.maxMentees');

            if (mentors.length === 0) {
                console.log(`❌ No mentors found for company "${companyName}". This explains the 'Pending' status.`);
                console.log('   Action required: Create/Assign a mentor to this company.');
            } else {
                console.log(`✅ Found ${mentors.length} mentors for company "${companyName}":`);
                let hasMatch = false;
                mentors.forEach(m => {
                    const isGradeMatch = m.mentorProfile?.grade === grade;
                    const hasCapacity = (m.mentorProfile?.currentMentees || 0) < (m.mentorProfile?.maxMentees || 10);
                    const status = isGradeMatch && hasCapacity ? 'MATCH ✅' : 'NO MATCH ❌';
                    console.log(`   - ${m.name} (${m.mentorProfile?.grade}) - Cap: ${m.mentorProfile?.currentMentees}/${m.mentorProfile?.maxMentees} - ${status}`);
                    if (isGradeMatch && hasCapacity) hasMatch = true;
                });

                if (!hasMatch) {
                    console.log(`❌ Mentors exist but none match grade "${grade}" with available capacity.`);
                } else {
                    console.log(`❓ eligible mentors exist. Auto-assignment should have triggered.`);
                }
            }
        }

    } catch (error) {
        console.error('Debug error:', error);
    } finally {
        mongoose.connection.close();
    }
};

debugPending();

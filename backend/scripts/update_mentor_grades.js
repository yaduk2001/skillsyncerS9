const mongoose = require('mongoose');
const User = require('../models/User');
const MentorRequest = require('../models/MentorRequest');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const updateGrades = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        // Find all approved mentor requests
        const approvedRequests = await MentorRequest.find({ status: 'approved' });
        console.log(`🔍 Found ${approvedRequests.length} approved mentor requests.`);

        let updatedCount = 0;
        let skippedCount = 0;
        let notFoundCount = 0;

        for (const req of approvedRequests) {
            const user = await User.findOne({ email: req.employeeEmail.toLowerCase() });

            if (!user) {
                console.log(`⚠️ User not found for request: ${req.employeeEmail}`);
                notFoundCount++;
                continue;
            }

            if (!user.mentorProfile) {
                console.log(`⚠️ User ${req.employeeEmail} has no mentor profile.`);
                skippedCount++;
                continue;
            }

            // Determine grade
            // 0-1, 1-3 -> B
            // 3-5, 5-10, 10+ -> A
            const exp = req.yearsOfExperience;
            let newGrade = 'B';
            if (['3-5', '5-10', '10+'].includes(exp)) {
                newGrade = 'A';
            }

            // Update if different
            if (user.mentorProfile.grade !== newGrade) {
                console.log(`📝 Updating ${user.name} (${req.employeeEmail}): Experience '${exp}' -> Grade '${newGrade}' (was '${user.mentorProfile.grade || 'B'}')`);
                user.mentorProfile.grade = newGrade;
                // Ensure field is marked modified if needed (though nested assignment usually works)
                user.markModified('mentorProfile');
                await user.save();
                updatedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log('\nSummary:');
        console.log(`✅ Updated: ${updatedCount}`);
        console.log(`⏭️ Skipped (Already correct): ${skippedCount}`);
        console.log(`❌ User Not Found: ${notFoundCount}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

updateGrades();

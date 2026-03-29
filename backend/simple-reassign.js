const mongoose = require('mongoose');
const User = require('./models/User');

// Simple script to reassign job seekers to real mentors with matching grades
async function simpleReassign() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsyncer';
    console.log('Connecting to database...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log('✅ Connected to database');

    // Step 1: Find job seekers with grades A and B who are assigned to auto-created mentors
    const jobseekersToReassign = await User.find({
      role: 'jobseeker',
      'profile.grade': { $in: ['A', 'B'] },
      'profile.assignedMentor': { $exists: true, $ne: null }
    }).populate('profile.assignedMentor', 'name email');

    console.log('\n=== Job Seekers with Grades A/B ===');
    console.log(`Found ${jobseekersToReassign.length} job seekers with grades A or B`);

    // Filter out those assigned to auto-created mentors
    const jobseekersWithAutoMentors = jobseekersToReassign.filter(js => {
      const mentor = js.profile.assignedMentor;
      return mentor && (
        mentor.email.includes('@skillsyncer.com') && 
        mentor.name.startsWith('Mentor ')
      );
    });

    console.log(`Job seekers assigned to auto-created mentors: ${jobseekersWithAutoMentors.length}`);

    if (jobseekersWithAutoMentors.length === 0) {
      console.log('✅ No job seekers assigned to auto-created mentors found!');
      return;
    }

    // Step 2: Find real mentors with grades A and B
    const realMentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      isActive: true,
      'mentorProfile.grade': { $in: ['A', 'B'] },
      email: { $not: /@skillsyncer\.com$/ } // Exclude auto-created mentors
    }).select('_id name email mentorProfile.grade mentorProfile.currentMentees mentorProfile.maxMentees');

    console.log('\n=== Real Mentors Available ===');
    const gradeAMentors = realMentors.filter(m => m.mentorProfile?.grade === 'A');
    const gradeBMentors = realMentors.filter(m => m.mentorProfile?.grade === 'B');
    
    console.log(`Grade A mentors: ${gradeAMentors.length}`);
    gradeAMentors.forEach(mentor => {
      const current = mentor.mentorProfile?.currentMentees || 0;
      const max = mentor.mentorProfile?.maxMentees || 5;
      console.log(`  ✅ ${mentor.name} (${mentor.email}) - Capacity: ${current}/${max}`);
    });

    console.log(`Grade B mentors: ${gradeBMentors.length}`);
    gradeBMentors.forEach(mentor => {
      const current = mentor.mentorProfile?.currentMentees || 0;
      const max = mentor.mentorProfile?.maxMentees || 5;
      console.log(`  ✅ ${mentor.name} (${mentor.email}) - Capacity: ${current}/${max}`);
    });

    if (realMentors.length === 0) {
      console.log('❌ No real mentors found! Please create mentors with grades A and B first.');
      return;
    }

    // Step 3: Reassign job seekers to real mentors
    console.log('\n=== Reassigning Job Seekers ===');
    
    let reassignedCount = 0;
    let failedCount = 0;

    for (const jobseeker of jobseekersWithAutoMentors) {
      try {
        const grade = jobseeker.profile.grade;
        const availableMentors = grade === 'A' ? gradeAMentors : gradeBMentors;
        
        if (availableMentors.length === 0) {
          console.log(`❌ No Grade ${grade} mentors available for ${jobseeker.name}`);
          failedCount++;
          continue;
        }

        // Find mentor with least mentees (load balancing)
        const bestMentor = availableMentors.reduce((best, current) => {
          const bestLoad = (best.mentorProfile?.currentMentees || 0) / (best.mentorProfile?.maxMentees || 5);
          const currentLoad = (current.mentorProfile?.currentMentees || 0) / (current.mentorProfile?.maxMentees || 5);
          return currentLoad < bestLoad ? current : best;
        });

        // Remove old assignment
        jobseeker.profile.assignedMentor = null;
        jobseeker.profile.mentorAssignmentDate = null;
        await jobseeker.save();

        // Assign new mentor
        jobseeker.profile.assignedMentor = bestMentor._id;
        jobseeker.profile.mentorAssignmentDate = new Date();
        await jobseeker.save();

        // Update mentor's mentee count
        if (!bestMentor.mentorProfile) bestMentor.mentorProfile = {};
        bestMentor.mentorProfile.currentMentees = (bestMentor.mentorProfile.currentMentees || 0) + 1;
        await bestMentor.save();

        console.log(`✅ ${jobseeker.name} (Grade ${grade}) → ${bestMentor.name}`);
        reassignedCount++;

      } catch (error) {
        console.log(`❌ Failed to reassign ${jobseeker.name}: ${error.message}`);
        failedCount++;
      }
    }

    // Step 4: Clean up auto-created mentors
    console.log('\n=== Cleaning Up Auto-Created Mentors ===');
    
    const autoCreatedMentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      email: { $regex: /@skillsyncer\.com$/ },
      name: { $regex: /^Mentor [A-Z] - / }
    });

    let deletedCount = 0;
    for (const mentor of autoCreatedMentors) {
      try {
        // Check if any job seekers are still assigned
        const assignedCount = await User.countDocuments({
          'profile.assignedMentor': mentor._id
        });

        if (assignedCount > 0) {
          console.log(`⚠️  Skipping ${mentor.name} - still has ${assignedCount} assigned job seekers`);
          continue;
        }

        await User.findByIdAndDelete(mentor._id);
        console.log(`🗑️  Deleted: ${mentor.name} (${mentor.email})`);
        deletedCount++;
      } catch (error) {
        console.log(`❌ Error deleting ${mentor.name}: ${error.message}`);
      }
    }

    // Final summary
    console.log('\n=== Summary ===');
    console.log(`Job seekers reassigned: ${reassignedCount}`);
    console.log(`Job seekers failed: ${failedCount}`);
    console.log(`Auto-created mentors deleted: ${deletedCount}`);
    console.log('✅ Reassignment completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the reassignment
simpleReassign();

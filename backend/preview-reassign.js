const mongoose = require('mongoose');
const User = require('./models/User');

// Preview script to show what will be reassigned
async function previewReassign() {
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

    // Find job seekers with grades A and B
    const jobseekersWithGrades = await User.find({
      role: 'jobseeker',
      'profile.grade': { $in: ['A', 'B'] },
      'profile.assignedMentor': { $exists: true, $ne: null }
    }).populate('profile.assignedMentor', 'name email');

    console.log('\n=== Job Seekers with Grades A/B ===');
    console.log(`Total job seekers with grades: ${jobseekersWithGrades.length}`);

    // Categorize by current mentor type
    const assignedToAutoMentors = [];
    const assignedToRealMentors = [];

    jobseekersWithGrades.forEach(js => {
      const mentor = js.profile.assignedMentor;
      if (mentor && mentor.email.includes('@skillsyncer.com') && mentor.name.startsWith('Mentor ')) {
        assignedToAutoMentors.push(js);
      } else {
        assignedToRealMentors.push(js);
      }
    });

    console.log(`Assigned to auto-created mentors: ${assignedToAutoMentors.length}`);
    console.log(`Assigned to real mentors: ${assignedToRealMentors.length}`);

    if (assignedToAutoMentors.length > 0) {
      console.log('\n=== Job Seekers to Reassign ===');
      assignedToAutoMentors.forEach(js => {
        console.log(`🔄 ${js.name} (Grade: ${js.profile.grade}) → Currently assigned to: ${js.profile.assignedMentor.name}`);
      });
    }

    // Find real mentors
    const realMentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      isActive: true,
      'mentorProfile.grade': { $in: ['A', 'B'] },
      email: { $not: /@skillsyncer\.com$/ }
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

    // Find auto-created mentors to delete
    const autoCreatedMentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      email: { $regex: /@skillsyncer\.com$/ },
      name: { $regex: /^Mentor [A-Z] - / }
    });

    console.log('\n=== Auto-Created Mentors to Delete ===');
    console.log(`Found ${autoCreatedMentors.length} auto-created mentors`);
    autoCreatedMentors.forEach(mentor => {
      console.log(`🗑️  ${mentor.name} (${mentor.email})`);
    });

    // Check if reassignment is possible
    console.log('\n=== Reassignment Feasibility ===');
    if (assignedToAutoMentors.length === 0) {
      console.log('✅ No job seekers need reassignment');
    } else if (realMentors.length === 0) {
      console.log('❌ No real mentors available for reassignment');
    } else {
      const gradeAJobseekers = assignedToAutoMentors.filter(js => js.profile.grade === 'A');
      const gradeBJobseekers = assignedToAutoMentors.filter(js => js.profile.grade === 'B');
      
      console.log(`Grade A job seekers: ${gradeAJobseekers.length} (Available mentors: ${gradeAMentors.length})`);
      console.log(`Grade B job seekers: ${gradeBJobseekers.length} (Available mentors: ${gradeBMentors.length})`);
      
      if (gradeAJobseekers.length > 0 && gradeAMentors.length === 0) {
        console.log('⚠️  Cannot reassign Grade A job seekers - no Grade A mentors available');
      }
      if (gradeBJobseekers.length > 0 && gradeBMentors.length === 0) {
        console.log('⚠️  Cannot reassign Grade B job seekers - no Grade B mentors available');
      }
      
      if ((gradeAJobseekers.length === 0 || gradeAMentors.length > 0) && 
          (gradeBJobseekers.length === 0 || gradeBMentors.length > 0)) {
        console.log('✅ All job seekers can be reassigned');
      }
    }

    console.log('\n=== What Will Happen ===');
    console.log(`1. ${assignedToAutoMentors.length} job seekers will be reassigned to real mentors`);
    console.log(`2. ${autoCreatedMentors.length} auto-created mentors will be deleted`);
    console.log(`3. Job seekers will be matched by grade (A→A, B→B)`);
    console.log(`4. Load balancing will be applied (least loaded mentors first)`);

    console.log('\n=== Next Steps ===');
    console.log('1. Review the above information');
    console.log('2. If everything looks correct, run: node simple-reassign.js');
    console.log('3. If you need to create more mentors first, use the admin panel');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the preview
previewReassign();

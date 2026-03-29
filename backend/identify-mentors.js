const mongoose = require('mongoose');
const User = require('./models/User');

// Script to identify and categorize mentors
async function identifyMentors() {
  try {
    // Try different MongoDB connection options
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsyncer';
    console.log('Attempting to connect to MongoDB...');
    console.log('URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // force IPv4
    });
    console.log('✅ Connected to database');

    // Find all mentors
    const allMentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      isActive: true
    }).select('_id name email mentorProfile.grade mentorProfile.categories mentorProfile.bio createdAt');

    console.log('\n=== All Active Mentors ===');
    console.log(`Total mentors: ${allMentors.length}`);

    // Categorize mentors
    const autoCreatedMentors = [];
    const realMentors = [];

    allMentors.forEach(mentor => {
      const isAutoCreated = mentor.email.match(/^mentor[a-z]+\.[a-z]+@skillsyncer\.com$/i) ||
                           mentor.name.match(/^Mentor [A-Z] - /) ||
                           (mentor.mentorProfile?.bio && mentor.mentorProfile.bio.includes('Default mentor for'));

      if (isAutoCreated) {
        autoCreatedMentors.push(mentor);
      } else {
        realMentors.push(mentor);
      }
    });

    console.log('\n=== Auto-Created Mentors ===');
    if (autoCreatedMentors.length === 0) {
      console.log('✅ No auto-created mentors found');
    } else {
      console.log(`Found ${autoCreatedMentors.length} auto-created mentors:`);
      autoCreatedMentors.forEach(mentor => {
        const createdDate = mentor.createdAt ? new Date(mentor.createdAt).toLocaleDateString() : 'Unknown';
        console.log(`❌ ${mentor.name} (${mentor.email})`);
        console.log(`   Grade: ${mentor.mentorProfile?.grade || 'None'}`);
        console.log(`   Categories: ${mentor.mentorProfile?.categories?.join(', ') || 'None'}`);
        console.log(`   Created: ${createdDate}`);
        console.log(`   Bio: ${mentor.mentorProfile?.bio || 'None'}`);
        console.log('');
      });
    }

    console.log('\n=== Real Mentors (Approved by Admin) ===');
    if (realMentors.length === 0) {
      console.log('❌ No real mentors found!');
    } else {
      console.log(`Found ${realMentors.length} real mentors:`);
      
      const gradeA = realMentors.filter(m => m.mentorProfile?.grade === 'A');
      const gradeB = realMentors.filter(m => m.mentorProfile?.grade === 'B');
      const noGrade = realMentors.filter(m => !m.mentorProfile?.grade);

      console.log(`   Grade A: ${gradeA.length}`);
      console.log(`   Grade B: ${gradeB.length}`);
      console.log(`   No grade: ${noGrade.length}`);

      realMentors.forEach(mentor => {
        const createdDate = mentor.createdAt ? new Date(mentor.createdAt).toLocaleDateString() : 'Unknown';
        console.log(`✅ ${mentor.name} (${mentor.email})`);
        console.log(`   Grade: ${mentor.mentorProfile?.grade || 'None'}`);
        console.log(`   Categories: ${mentor.mentorProfile?.categories?.join(', ') || 'None'}`);
        console.log(`   Created: ${createdDate}`);
        console.log(`   Bio: ${mentor.mentorProfile?.bio || 'None'}`);
        console.log('');
      });
    }

    // Check job seeker assignments
    console.log('\n=== Job Seeker Assignments ===');
    const jobseekersWithMentors = await User.find({
      role: 'jobseeker',
      'profile.assignedMentor': { $exists: true, $ne: null }
    }).select('_id name email profile.grade profile.assignedMentor profile.mentorAssignmentDate')
      .populate('profile.assignedMentor', 'name email');

    console.log(`Total job seekers with mentors: ${jobseekersWithMentors.length}`);

    const assignedToAutoMentors = jobseekersWithMentors.filter(js => {
      const mentor = js.profile.assignedMentor;
      return mentor && (
        mentor.email.match(/^mentor[a-z]+\.[a-z]+@skillsyncer\.com$/i) ||
        mentor.name.match(/^Mentor [A-Z] - /)
      );
    });

    const assignedToRealMentors = jobseekersWithMentors.filter(js => {
      const mentor = js.profile.assignedMentor;
      return mentor && !(
        mentor.email.match(/^mentor[a-z]+\.[a-z]+@skillsyncer\.com$/i) ||
        mentor.name.match(/^Mentor [A-Z] - /)
      );
    });

    console.log(`   Assigned to auto-created mentors: ${assignedToAutoMentors.length}`);
    console.log(`   Assigned to real mentors: ${assignedToRealMentors.length}`);

    if (assignedToAutoMentors.length > 0) {
      console.log('\nJob seekers assigned to auto-created mentors:');
      assignedToAutoMentors.forEach(js => {
        const assignmentDate = js.profile?.mentorAssignmentDate ? new Date(js.profile.mentorAssignmentDate).toLocaleDateString() : 'Unknown';
        console.log(`   ${js.name} → ${js.profile.assignedMentor.name} (assigned: ${assignmentDate})`);
      });
    }

    console.log('\n=== Summary ===');
    console.log(`Auto-created mentors: ${autoCreatedMentors.length}`);
    console.log(`Real mentors: ${realMentors.length}`);
    console.log(`Job seekers assigned to auto-created mentors: ${assignedToAutoMentors.length}`);
    console.log(`Job seekers assigned to real mentors: ${assignedToRealMentors.length}`);

    if (autoCreatedMentors.length > 0 || assignedToAutoMentors.length > 0) {
      console.log('\n⚠️  Cleanup needed! Run: node backend/cleanup-auto-mentors.js');
    } else {
      console.log('\n✅ System is clean! No auto-created mentors found.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the identification
identifyMentors();

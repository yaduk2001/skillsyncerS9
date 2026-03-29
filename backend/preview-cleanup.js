const mongoose = require('mongoose');
const User = require('./models/User');

// Script to preview what will be cleaned up (dry run)
async function previewCleanup() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsyncer');
    console.log('Connected to database');

    // Find auto-created mentors (they have specific email patterns)
    const autoCreatedMentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      email: { $regex: /^mentor[a-z]+\.[a-z]+@skillsyncer\.com$/i }
    }).select('_id name email mentorProfile.grade mentorProfile.categories createdAt');

    console.log('\n=== Auto-Created Mentors Found ===');
    if (autoCreatedMentors.length === 0) {
      console.log('✅ No auto-created mentors found. System is clean!');
      return;
    }

    console.log(`Found ${autoCreatedMentors.length} auto-created mentors:`);
    autoCreatedMentors.forEach(mentor => {
      const createdDate = mentor.createdAt ? new Date(mentor.createdAt).toLocaleDateString() : 'Unknown';
      console.log(`❌ ${mentor.name} (${mentor.email})`);
      console.log(`   Grade: ${mentor.mentorProfile?.grade || 'None'}`);
      console.log(`   Categories: ${mentor.mentorProfile?.categories?.join(', ') || 'None'}`);
      console.log(`   Created: ${createdDate}`);
    });

    // Find job seekers assigned to these auto-created mentors
    const jobseekersToReassign = await User.find({
      role: 'jobseeker',
      'profile.assignedMentor': { $in: autoCreatedMentors.map(m => m._id) }
    }).select('_id name email profile.grade profile.preferredCategory profile.assignedMentor profile.mentorAssignmentDate');

    console.log('\n=== Job Seekers Assigned to Auto-Created Mentors ===');
    if (jobseekersToReassign.length === 0) {
      console.log('✅ No job seekers assigned to auto-created mentors');
    } else {
      console.log(`Found ${jobseekersToReassign.length} job seekers to reassign:`);
      jobseekersToReassign.forEach(js => {
        const assignmentDate = js.profile?.mentorAssignmentDate ? new Date(js.profile.mentorAssignmentDate).toLocaleDateString() : 'Unknown';
        console.log(`🔄 ${js.name} (${js.email})`);
        console.log(`   Grade: ${js.profile?.grade || 'Unknown'}`);
        console.log(`   Category: ${js.profile?.preferredCategory || 'Unknown'}`);
        console.log(`   Assigned: ${assignmentDate}`);
      });
    }

    // Find real mentors (approved by admin)
    const realMentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      isActive: true,
      email: { $not: { $regex: /^mentor[a-z]+\.[a-z]+@skillsyncer\.com$/i } }
    }).select('_id name email mentorProfile.grade mentorProfile.categories mentorProfile.currentMentees mentorProfile.maxMentees');

    console.log('\n=== Real Mentors Available ===');
    if (realMentors.length === 0) {
      console.log('❌ No real mentors found! Please create mentors first using the admin panel.');
      return;
    }

    const gradeAMentors = realMentors.filter(m => m.mentorProfile?.grade === 'A');
    const gradeBMentors = realMentors.filter(m => m.mentorProfile?.grade === 'B');

    console.log(`Total real mentors: ${realMentors.length}`);
    console.log(`Grade A mentors: ${gradeAMentors.length}`);
    console.log(`Grade B mentors: ${gradeBMentors.length}`);

    // Group by categories
    const categoryGroups = {};
    realMentors.forEach(mentor => {
      const categories = mentor.mentorProfile?.categories || [];
      categories.forEach(category => {
        if (!categoryGroups[category]) {
          categoryGroups[category] = { A: 0, B: 0, total: 0 };
        }
        categoryGroups[category].total++;
        if (mentor.mentorProfile?.grade === 'A') categoryGroups[category].A++;
        if (mentor.mentorProfile?.grade === 'B') categoryGroups[category].B++;
      });
    });

    console.log('\n=== Mentor Coverage by Category ===');
    Object.entries(categoryGroups).forEach(([category, counts]) => {
      console.log(`${category}: ${counts.total} mentors (A: ${counts.A}, B: ${counts.B})`);
    });

    // Check if we can reassign all job seekers
    console.log('\n=== Reassignment Feasibility ===');
    if (jobseekersToReassign.length === 0) {
      console.log('✅ No job seekers need reassignment');
    } else {
      let canReassignAll = true;
      const reassignmentIssues = [];

      for (const jobseeker of jobseekersToReassign) {
        const grade = jobseeker.profile?.grade || 'B';
        const category = jobseeker.profile?.preferredCategory || null;
        
        // Check if we have mentors for this grade and category
        let suitableMentors = realMentors.filter(m => m.mentorProfile?.grade === grade);
        
        if (category) {
          suitableMentors = suitableMentors.filter(m => 
            m.mentorProfile?.categories?.includes(category)
          );
        }

        if (suitableMentors.length === 0) {
          canReassignAll = false;
          reassignmentIssues.push(`${jobseeker.name}: No ${grade} mentors for category "${category}"`);
        }
      }

      if (canReassignAll) {
        console.log('✅ All job seekers can be reassigned to real mentors');
      } else {
        console.log('⚠️  Some job seekers cannot be reassigned:');
        reassignmentIssues.forEach(issue => console.log(`   - ${issue}`));
      }
    }

    console.log('\n=== What Will Happen ===');
    console.log(`1. ${autoCreatedMentors.length} auto-created mentors will be deleted`);
    console.log(`2. ${jobseekersToReassign.length} job seekers will be reassigned to real mentors`);
    console.log(`3. Mentor assignments will be updated to use only approved mentors`);

    console.log('\n=== Next Steps ===');
    console.log('1. Review the above information carefully');
    console.log('2. If everything looks correct, run: node backend/cleanup-auto-mentors.js');
    console.log('3. If you need to create more mentors first, use the admin panel');

  } catch (error) {
    console.error('❌ Preview failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the preview
previewCleanup();

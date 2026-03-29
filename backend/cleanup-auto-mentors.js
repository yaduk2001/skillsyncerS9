const mongoose = require('mongoose');
const User = require('./models/User');
const { assignMentorToJobSeeker, findBestMentor } = require('./utils/mentorAssignment');

// Script to clean up auto-created mentors and reassign job seekers to real mentors
async function cleanupAutoMentors() {
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

    // Find auto-created mentors (they have specific email patterns)
    const autoCreatedMentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      email: { $regex: /^mentor[a-z]+\.[a-z]+@skillsyncer\.com$/i }
    }).select('_id name email mentorProfile.grade mentorProfile.categories');

    console.log('\n=== Auto-Created Mentors Found ===');
    if (autoCreatedMentors.length === 0) {
      console.log('✅ No auto-created mentors found. System is clean!');
      return;
    }

    console.log(`Found ${autoCreatedMentors.length} auto-created mentors:`);
    autoCreatedMentors.forEach(mentor => {
      console.log(`❌ ${mentor.name} (${mentor.email}) - Grade: ${mentor.mentorProfile?.grade}, Categories: ${mentor.mentorProfile?.categories?.join(', ') || 'None'}`);
    });

    // Find job seekers assigned to these auto-created mentors
    const jobseekersToReassign = await User.find({
      role: 'jobseeker',
      'profile.assignedMentor': { $in: autoCreatedMentors.map(m => m._id) }
    }).select('_id name email profile.grade profile.preferredCategory profile.assignedMentor');

    console.log('\n=== Job Seekers Assigned to Auto-Created Mentors ===');
    if (jobseekersToReassign.length === 0) {
      console.log('✅ No job seekers assigned to auto-created mentors');
    } else {
      console.log(`Found ${jobseekersToReassign.length} job seekers to reassign:`);
      jobseekersToReassign.forEach(js => {
        console.log(`🔄 ${js.name} (${js.email}) - Grade: ${js.profile?.grade || 'Unknown'}, Category: ${js.profile?.preferredCategory || 'Unknown'}`);
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

    realMentors.forEach(mentor => {
      const currentMentees = mentor.mentorProfile?.currentMentees || 0;
      const maxMentees = mentor.mentorProfile?.maxMentees || 5;
      const capacity = `${currentMentees}/${maxMentees}`;
      console.log(`✅ ${mentor.name} (${mentor.email}) - Grade: ${mentor.mentorProfile?.grade}, Categories: ${mentor.mentorProfile?.categories?.join(', ') || 'None'}, Capacity: ${capacity}`);
    });

    if (jobseekersToReassign.length === 0) {
      console.log('\n✅ No job seekers need reassignment. Proceeding to clean up auto-created mentors...');
    } else {
      console.log('\n=== Reassigning Job Seekers ===');
      
      let reassignedCount = 0;
      let failedCount = 0;

      for (const jobseeker of jobseekersToReassign) {
        try {
          console.log(`\n🔄 Reassigning ${jobseeker.name}...`);
          
          // Remove current assignment
          jobseeker.profile.assignedMentor = null;
          jobseeker.profile.mentorAssignmentDate = null;
          await jobseeker.save();

          // Find new mentor
          const grade = jobseeker.profile?.grade || 'B';
          const category = jobseeker.profile?.preferredCategory || null;
          
          const mentorResult = await findBestMentor(jobseeker._id, grade, category);
          
          if (mentorResult.success) {
            const assignmentResult = await assignMentorToJobSeeker(jobseeker._id, grade, category);
            
            if (assignmentResult.success && assignmentResult.mentorAssigned) {
              console.log(`✅ Reassigned to: ${assignmentResult.mentor?.name || 'Unknown'}`);
              reassignedCount++;
            } else {
              console.log(`❌ Failed to assign new mentor: ${assignmentResult.message}`);
              failedCount++;
            }
          } else {
            console.log(`❌ No suitable mentor found: ${mentorResult.message}`);
            failedCount++;
          }
        } catch (error) {
          console.error(`❌ Error reassigning ${jobseeker.name}:`, error.message);
          failedCount++;
        }
      }

      console.log(`\n📊 Reassignment Summary:`);
      console.log(`   Successfully reassigned: ${reassignedCount}`);
      console.log(`   Failed to reassign: ${failedCount}`);
    }

    // Clean up auto-created mentors
    console.log('\n=== Cleaning Up Auto-Created Mentors ===');
    
    let deletedCount = 0;
    for (const mentor of autoCreatedMentors) {
      try {
        // Check if any job seekers are still assigned to this mentor
        const assignedJobseekers = await User.countDocuments({
          'profile.assignedMentor': mentor._id
        });

        if (assignedJobseekers > 0) {
          console.log(`⚠️  Skipping ${mentor.name} - still has ${assignedJobseekers} assigned job seekers`);
          continue;
        }

        await User.findByIdAndDelete(mentor._id);
        console.log(`🗑️  Deleted auto-created mentor: ${mentor.name} (${mentor.email})`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Error deleting mentor ${mentor.name}:`, error.message);
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   Auto-created mentors found: ${autoCreatedMentors.length}`);
    console.log(`   Auto-created mentors deleted: ${deletedCount}`);
    console.log(`   Job seekers reassigned: ${reassignedCount || 0}`);
    console.log(`   Job seekers failed to reassign: ${failedCount || 0}`);

    // Final verification
    console.log('\n=== Final Verification ===');
    const remainingAutoMentors = await User.countDocuments({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      email: { $regex: /^mentor[a-z]+\.[a-z]+@skillsyncer\.com$/i }
    });

    const unassignedJobseekers = await User.countDocuments({
      role: 'jobseeker',
      'profile.assignedMentor': { $in: autoCreatedMentors.map(m => m._id) }
    });

    if (remainingAutoMentors === 0) {
      console.log('✅ All auto-created mentors have been cleaned up');
    } else {
      console.log(`⚠️  ${remainingAutoMentors} auto-created mentors still remain`);
    }

    if (unassignedJobseekers === 0) {
      console.log('✅ All job seekers have been properly reassigned');
    } else {
      console.log(`⚠️  ${unassignedJobseekers} job seekers still assigned to auto-created mentors`);
    }

    console.log('\n🎉 Cleanup completed!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the cleanup
cleanupAutoMentors();

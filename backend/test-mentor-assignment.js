const mongoose = require('mongoose');
const User = require('./models/User');
const { assignMentorToJobSeeker, findBestMentor } = require('./utils/mentorAssignment');

// Test script to verify mentor assignment works with existing mentors only
async function testMentorAssignment() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsyncer');
    console.log('Connected to database');

    // Find existing mentors with grades A and B
    const mentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      isActive: true,
      'mentorProfile.grade': { $in: ['A', 'B'] }
    }).select('name email mentorProfile.grade mentorProfile.categories');

    console.log('\n=== Existing Mentors ===');
    if (mentors.length === 0) {
      console.log('❌ No mentors with grades A or B found in database');
      console.log('Please create mentors with grades A and B using the admin panel first');
      return;
    }

    mentors.forEach(mentor => {
      console.log(`✅ ${mentor.name} (${mentor.email}) - Grade: ${mentor.mentorProfile?.grade}, Categories: ${mentor.mentorProfile?.categories?.join(', ') || 'None'}`);
    });

    // Test mentor assignment for a sample jobseeker
    console.log('\n=== Testing Mentor Assignment ===');
    
    // Create a test jobseeker
    const testJobseeker = await User.create({
      name: 'Test Jobseeker',
      email: 'test.jobseeker@example.com',
      password: 'test123',
      role: 'jobseeker',
      profile: {
        grade: 'A',
        preferredCategory: 'Front-end Developer'
      }
    });

    console.log(`Created test jobseeker: ${testJobseeker.name}`);

    // Test finding best mentor
    const mentorResult = await findBestMentor(testJobseeker._id, 'A', 'Front-end Developer');
    
    if (mentorResult.success) {
      console.log(`✅ Found mentor: ${mentorResult.mentor.name} (Grade: ${mentorResult.mentor.grade})`);
      
      // Test assignment
      const assignmentResult = await assignMentorToJobSeeker(testJobseeker._id, 'A', 'Front-end Developer');
      
      if (assignmentResult.success && assignmentResult.mentorAssigned) {
        console.log('✅ Mentor assignment successful!');
        console.log(`Assigned mentor: ${assignmentResult.mentor?.name || 'Unknown'}`);
      } else {
        console.log('❌ Mentor assignment failed:', assignmentResult.message);
      }
    } else {
      console.log('❌ No mentor found:', mentorResult.message);
    }

    // Clean up test jobseeker
    await User.findByIdAndDelete(testJobseeker._id);
    console.log('\n✅ Test completed and cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the test
testMentorAssignment();

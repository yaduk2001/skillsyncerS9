const express = require('express');
const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication');

const router = express.Router();

// @desc    Remove mentors from job seekers who shouldn't have them
// @route   POST /api/mentor-cleanup/remove-invalid-assignments
// @access  Private (Admin only)
router.post('/remove-invalid-assignments', async (req, res) => {
  try {
    console.log('🧹 Starting cleanup of invalid mentor assignments...');

    // Find all job seekers with assigned mentors
    const jobseekersWithMentors = await User.find({
      role: 'jobseeker',
      'profile.assignedMentor': { $exists: true, $ne: null }
    }).populate('profile.assignedMentor', 'name email');

    console.log(`Found ${jobseekersWithMentors.length} job seekers with assigned mentors`);

    let removedCount = 0;
    let keptCount = 0;
    const removalDetails = [];

    for (const jobseeker of jobseekersWithMentors) {
      try {
        const shouldHaveMentor = await shouldJobseekerHaveMentor(jobseeker);
        
        if (!shouldHaveMentor.valid) {
          // Remove mentor assignment
          const oldMentor = jobseeker.profile.assignedMentor;
          
          jobseeker.profile.assignedMentor = null;
          jobseeker.profile.mentorAssignmentDate = null;
          await jobseeker.save();

          // Update mentor's mentee count
          if (oldMentor) {
            const mentor = await User.findById(oldMentor._id);
            if (mentor && mentor.mentorProfile) {
              mentor.mentorProfile.currentMentees = Math.max(0, (mentor.mentorProfile.currentMentees || 0) - 1);
              await mentor.save();
            }
          }

          console.log(`❌ Removed mentor from ${jobseeker.name}: ${shouldHaveMentor.reason}`);
          removedCount++;
          removalDetails.push({
            jobseeker: jobseeker.name,
            oldMentor: oldMentor?.name || 'Unknown',
            reason: shouldHaveMentor.reason,
            action: 'removed'
          });
        } else {
          console.log(`✅ Keeping mentor for ${jobseeker.name}: Valid assignment`);
          keptCount++;
          removalDetails.push({
            jobseeker: jobseeker.name,
            mentor: jobseeker.profile.assignedMentor?.name || 'Unknown',
            reason: 'Valid assignment',
            action: 'kept'
          });
        }
      } catch (error) {
        console.error(`❌ Error processing ${jobseeker.name}:`, error.message);
        removalDetails.push({
          jobseeker: jobseeker.name,
          reason: `Error: ${error.message}`,
          action: 'error'
        });
      }
    }

    console.log('✅ Cleanup completed!');

    res.json({
      success: true,
      message: 'Mentor assignment cleanup completed',
      removed: removedCount,
      kept: keptCount,
      total: jobseekersWithMentors.length,
      details: removalDetails
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message
    });
  }
});

// @desc    Get status of invalid mentor assignments
// @route   GET /api/mentor-cleanup/status
// @access  Private (Admin only)
router.get('/status', async (req, res) => {
  try {
    // Find all job seekers with assigned mentors
    const jobseekersWithMentors = await User.find({
      role: 'jobseeker',
      'profile.assignedMentor': { $exists: true, $ne: null }
    }).populate('profile.assignedMentor', 'name email');

    let validAssignments = 0;
    let invalidAssignments = 0;
    const invalidDetails = [];

    for (const jobseeker of jobseekersWithMentors) {
      const shouldHaveMentor = await shouldJobseekerHaveMentor(jobseeker);
      
      if (shouldHaveMentor.valid) {
        validAssignments++;
      } else {
        invalidAssignments++;
        invalidDetails.push({
          jobseeker: jobseeker.name,
          email: jobseeker.email,
          mentor: jobseeker.profile.assignedMentor?.name || 'Unknown',
          reason: shouldHaveMentor.reason,
          grade: jobseeker.profile?.grade || 'No grade',
          hasSelection: shouldHaveMentor.hasSelection
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalWithMentors: jobseekersWithMentors.length,
        validAssignments,
        invalidAssignments,
        invalidDetails
      }
    });

  } catch (error) {
    console.error('❌ Status check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Status check failed',
      error: error.message
    });
  }
});

// Helper function to determine if a job seeker should have a mentor
async function shouldJobseekerHaveMentor(jobseeker) {
  // Check if they have a grade (A or B)
  const hasGrade = jobseeker.profile?.grade && ['A', 'B'].includes(jobseeker.profile.grade);
  
  if (!hasGrade) {
    return {
      valid: false,
      reason: 'No grade (A or B) assigned',
      hasSelection: false
    };
  }

  // Check if they have been selected for an internship
  const selectedApplication = await InternshipApplication.findOne({ 
    jobseekerId: jobseeker._id, 
    status: 'selected' 
  });

  if (!selectedApplication) {
    return {
      valid: false,
      reason: 'Not selected for any internship',
      hasSelection: false
    };
  }

  return {
    valid: true,
    reason: 'Has grade and internship selection',
    hasSelection: true
  };
}

module.exports = router;

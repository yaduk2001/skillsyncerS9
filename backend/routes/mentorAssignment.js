const express = require('express');
const { protect } = require('../middleware/auth');
const router = express.Router();

const InternshipApplication = require('../models/InternshipApplication');
const User = require('../models/User');

const {
  getMentorStatus,
  getMentorMentees,
  allocateMentor,
  removeMentorAssignment
} = require('../utils/mentorAssignment');

/**
 * @route   GET /api/mentor-assignment/my-mentor
 * @desc    Get current user's mentor assignment status
 * @access  Private (Jobseeker)
 */
router.get('/my-mentor', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Auto-correction logic: Check if grade needs upgrade based on new 80-mark logic
    const user = await User.findById(userId).populate('profile.assignedMentor');
    const latestApp = await InternshipApplication.findOne({
      jobseekerId: userId,
      result: 'Passed'
    }).sort({ submittedAt: -1, createdAt: -1 });

    if (user && latestApp && typeof latestApp.score === 'number') {
      // Calculate adjusted grade (treating score as out of 80)
      const percentage = Math.min(100, Math.round((latestApp.score / 80) * 100));
      let newGrade = null;
      if (percentage >= 80) newGrade = 'A';
      else if (percentage >= 60) newGrade = 'B';

      const currentGrade = user.profile?.grade;

      // If grade improved (e.g., B -> A) or wasn't set correctly
      if (newGrade && newGrade !== currentGrade) {
        console.log(`[AutoFix] Updating grade for ${user.name}: ${currentGrade} -> ${newGrade} (Score: ${latestApp.score}/80)`);

        user.profile = user.profile || {};
        user.profile.grade = newGrade;
        await user.save();

        // If user is now Grade A but has a Grade B mentor or no mentor, trigger reallocation
        const mentor = user.profile.assignedMentor;
        const mentorGrade = mentor?.mentorProfile?.grade;

        if (newGrade === 'A' && (!mentor || mentorGrade !== 'A')) {
          console.log('[AutoFix] Reallocating Grade A mentor...');
          if (mentor) {
            await removeMentorAssignment(userId);
          }
          await allocateMentor(userId, newGrade, latestApp.employerId);
        } else if (!mentor) {
          // If no mentor at all, allocate
          await allocateMentor(userId, newGrade, latestApp.employerId);
        }
      }
    }

    const result = await getMentorStatus(req.user.id);

    // Return 200 even if no mentor, as 'waiting' is a valid state
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching mentor status:', error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/**
 * @route   GET /api/mentor-assignment/my-mentees
 * @desc    Get all mentees assigned to the current mentor
 * @access  Private (Mentor)
 */
router.get('/my-mentees', protect, async (req, res) => {
  try {
    // Check if user is a mentor
    if (!req.user.hasRole('mentor')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Mentor privileges required.'
      });
    }

    const result = await getMentorMentees(req.user.id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching mentees:', error);
    res.status(500).json({ success: false, message: "Server Error", mentees: [] });
  }
});

/**
 * @route   POST /api/mentor-assignment/assign
 * @desc    Manually trigger allocation for current user
 * @access  Private (Jobseeker)
 */
router.post('/assign', protect, async (req, res) => {
  try {
    const result = await allocateMentor(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in allocation trigger:', error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/**
 * @route   GET /api/mentor-assignment/statistics
 * @desc    Get mentor assignment statistics (for dashboard KPIs)
 * @access  Private
 */
router.get('/statistics', protect, async (req, res) => {
  try {
    const User = require('../models/User');

    // Get total mentors by grade
    const gradeAMentors = await User.countDocuments({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      'mentorProfile.grade': 'A',
      isActive: true
    });

    const gradeBMentors = await User.countDocuments({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      'mentorProfile.grade': 'B',
      isActive: true
    });

    // Get jobseekers with mentors
    const assignedJobseekers = await User.countDocuments({
      role: 'jobseeker',
      'profile.assignedMentor': { $ne: null }
    });

    // Get jobseekers in queue
    const pendingJobseekers = await User.countDocuments({
      role: 'jobseeker',
      'profile.assignmentQueue.status': 'pending'
    });

    res.json({
      success: true,
      data: {
        mentors: {
          gradeA: gradeAMentors,
          gradeB: gradeBMentors,
          total: gradeAMentors + gradeBMentors
        },
        jobseekers: {
          assigned: assignedJobseekers,
          pending: pendingJobseekers
        }
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;

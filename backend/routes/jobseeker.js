const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const JobseekerProfile = require('../models/JobseekerProfile');
const InternshipPosting = require('../models/InternshipPosting');
const InternshipApplication = require('../models/InternshipApplication');
const { protect, authorize } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { updateProfileATSScore, generateATSSuggestions } = require('../utils/atsScoring');
const { assignMentorToJobSeeker } = require('../utils/mentorAssignment');
const { sendShortlistEmail, sendRejectionEmail } = require('../utils/emailService');
const { extractText, extractEntities, isLikelyResume } = require('../utils/resumeParser');
const { analyzeAndSaveNLP, computeNLPScore } = require('../utils/atsScoringNLP');
const MentorTask = require('../models/MentorTask');
const MentorMeeting = require('../models/MentorMeeting');
const MentorResource = require('../models/MentorResource');
const MentorSubmission = require('../models/MentorSubmission');
const MilestoneFeedback = require('../models/MilestoneFeedback');
const { matchCandidateToJob, recordFeedback } = require('../utils/aiService');

const router = express.Router();



// Apply protection and role authorization to all routes
router.use(protect);
router.use(authorize('jobseeker'));

// ==================== COURSE MODULE (Tasks / Meetings / Resources) ====================
// These are powered by mentor workspace models (MentorTask, MentorMeeting, MentorResource, MentorSubmission).

// GET /api/jobseeker/course/tasks
router.get('/course/tasks', async (req, res) => {
  try {
    const menteeId = req.user._id;

    const tasks = await MentorTask.find({ assignedTo: menteeId, status: 'active' })
      .sort({ createdAt: -1 })
      .lean();

    const taskIds = tasks.map((t) => t._id);
    const submissions = await MentorSubmission.find({ menteeId, taskId: { $in: taskIds } })
      .sort({ submissionVersion: -1 })  // Get latest version first
      .lean();

    // Map to get the latest submission for each task
    const submissionByTask = new Map();
    for (const s of submissions) {
      const key = s.taskId?.toString?.();
      if (key && !submissionByTask.has(key)) submissionByTask.set(key, s);  // First one is latest due to sort
    }

    const data = tasks.map((t) => {
      const sub = submissionByTask.get(t._id.toString()) || null;
      const completed = !!sub;
      return {
        id: t._id,
        title: t.title,
        description: t.description,
        domain: t.domain,
        dueDate: t.dueDate,
        link: t.link,
        status: completed ? 'completed' : 'pending',
        submission: sub
          ? {
            _id: sub._id,
            submittedAt: sub.createdAt,
            type: sub.submissionType,
            value: sub.link || sub.notes || '',
            notes: sub.notes || '',
            files: sub.files || [],
            reviewStatus: sub.reviewStatus || 'pending',
            mentorFeedback: sub.mentorFeedback || '',
            reviewedAt: sub.reviewedAt,
            submissionVersion: sub.submissionVersion || 1,
          }
          : null,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Course tasks error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load course tasks', error: error.message });
  }
});

// POST /api/jobseeker/course/tasks/:taskId/submit
router.post('/course/tasks/:taskId/submit', async (req, res) => {
  try {
    const menteeId = req.user._id;
    const { taskId } = req.params;
    const { link = '', notes = '' } = req.body || {};

    const task = await MentorTask.findById(taskId).lean();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // ensure this task was assigned to this mentee
    const assigned = Array.isArray(task.assignedTo) && task.assignedTo.some((id) => id.toString() === menteeId.toString());
    if (!assigned) return res.status(403).json({ success: false, message: 'Access denied: task not assigned to you' });

    const submission = await MentorSubmission.create({
      mentorId: task.mentorId,
      menteeId,
      domain: task.domain,
      title: task.title,
      taskId: task._id,
      submissionType: 'link',
      link: String(link || ''),
      notes: String(notes || ''),
      files: [],
      submissionVersion: 1,
      previousSubmissionId: null,
    });

    return res.status(201).json({ success: true, data: submission });
  } catch (error) {
    console.error('Course task submit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit task', error: error.message });
  }
});



// GET /api/jobseeker/course/meetings
router.get('/course/meetings', async (req, res) => {
  try {
    const menteeId = req.user._id;

    const meetings = await MentorMeeting.find({ targetMentees: menteeId })
      .sort({ dateTime: 1 })
      .lean();

    return res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('Course meetings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load meetings', error: error.message });
  }
});

// GET /api/jobseeker/course/resources
router.get('/course/resources', async (req, res) => {
  try {
    const menteeId = req.user._id;

    // Identify domains and mentors for this jobseeker from their applications
    const apps = await InternshipApplication.find({
      jobseekerId: menteeId,
      status: { $in: ['selected', 'active', 'completed'] },
      mentorId: { $ne: null },
    })
      .select('mentorId internshipDetails.title')
      .lean();

    const mentorIds = Array.from(new Set(apps.map((a) => a.mentorId?.toString()).filter(Boolean)));
    const domains = Array.from(
      new Set(apps.map((a) => a?.internshipDetails?.title).filter(Boolean).map((d) => String(d).trim()))
    );

    if (mentorIds.length === 0 || domains.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const resources = await MentorResource.find({
      mentorId: { $in: mentorIds },
      domain: { $in: domains },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: resources });
  } catch (error) {
    console.error('Course resources error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load resources', error: error.message });
  }
});

// @desc    Get jobseeker dashboard data
// @route   GET /api/jobseeker/dashboard
// @access  Private (Jobseeker only)
router.get('/dashboard', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate profile completion suggestions for quick actions
    const quickActions = [];

    if (!user.profile.bio) {
      quickActions.push({
        id: 'add-bio',
        title: 'Add Professional Bio',
        description: 'Tell employers about yourself',
        icon: 'user',
        priority: 'high',
        action: 'complete-profile',
        field: 'bio'
      });
    }

    if (!user.profile.skills || user.profile.skills.length === 0) {
      quickActions.push({
        id: 'add-skills',
        title: 'Add Your Skills',
        description: 'List your technical abilities',
        icon: 'code',
        priority: 'high',
        action: 'complete-profile',
        field: 'skills'
      });
    }

    if (!user.profile.resume) {
      quickActions.push({
        id: 'upload-resume',
        title: 'Upload Resume',
        description: 'Make applications easier',
        icon: 'file-text',
        priority: 'high',
        action: 'complete-profile',
        field: 'resume'
      });
    }

    if (!user.profile.location) {
      quickActions.push({
        id: 'add-location',
        title: 'Add Location',
        description: 'Help employers find local talent',
        icon: 'map-pin',
        priority: 'medium',
        action: 'complete-profile',
        field: 'location'
      });
    }

    if (!user.profile.phone) {
      quickActions.push({
        id: 'add-phone',
        title: 'Add Phone Number',
        description: 'Let employers contact you',
        icon: 'phone',
        priority: 'medium',
        action: 'complete-profile',
        field: 'phone'
      });
    }

    // Auto-assign on read: if test grade present and selected, but no mentor yet
    if (!user.profile.assignedMentor && ['A', 'B'].includes(user.profile?.grade)) {
      console.log(`🔍 Auto-assign check for ${user.name} (${user.email}): grade=${user.profile?.grade}, hasMentor=${!!user.profile.assignedMentor}`);
      try {
        const selectedApplication = await InternshipApplication.findOne({ jobseekerId: user._id, status: 'selected' }).sort({ updatedAt: -1 });
        console.log(`📋 Selected application found:`, selectedApplication ? 'YES' : 'NO');
        if (selectedApplication) {
          const preferredCategory = user.profile?.preferredCategory || selectedApplication?.internshipDetails?.title || selectedApplication?.internshipDetails?.type || null;
          console.log(`🎯 Attempting assignment: grade=${user.profile.grade}, category=${preferredCategory}`);
          // Use test grade from the application, not profile grade
          const testGrade = selectedApplication?.result === 'Passed' ?
            (selectedApplication?.score >= 64 ? 'A' : 'B') : user.profile.grade;
          const assignResult = await assignMentorToJobSeeker(user._id, testGrade, preferredCategory);
          console.log(`📊 Assignment result:`, assignResult);
          if (assignResult && assignResult.success && assignResult.mentorAssigned) {
            // reload user minimal fields to reflect assignment in the response
            const fresh = await User.findById(user._id).select('profile.assignedMentor profile.mentorAssignmentDate');
            if (fresh) {
              user.profile.assignedMentor = fresh.profile?.assignedMentor;
              user.profile.mentorAssignmentDate = fresh.profile?.mentorAssignmentDate;
              console.log(`✅ Mentor assigned: ${fresh.profile?.assignedMentor}`);
            }
          }
        }
      } catch (autoErr) {
        console.error('Auto-assign on dashboard fetch error:', autoErr.message);
      }
    }

    // Get mentor assignment information if available
    let mentorInfo = null;
    if (user.profile.assignedMentor) {
      try {
        const mentor = await User.findById(user.profile.assignedMentor)
          .select('name email mentorProfile.grade mentorProfile.expertise');
        if (mentor) {
          mentorInfo = {
            _id: mentor._id,
            name: mentor.name,
            email: mentor.email,
            mentorProfile: mentor.mentorProfile
          };
        }
      } catch (error) {
        console.error('Error fetching mentor info:', error);
      }
    }

    // Dashboard statistics (you can expand this based on your needs)
    const dashboardData = {
      profile: {
        completionPercentage: user.profileCompletion,
        name: user.name,
        email: user.email,
        bio: user.profile.bio,
        skills: user.profile.skills || [],
        experience: user.profile.experience,
        location: user.profile.location,
        phone: user.profile.phone,
        resume: user.profile.resume,
        portfolio: user.profile.portfolio,
        profilePicture: user.profile.profilePicture,
        socialLinks: user.profile.socialLinks || {},
        jobPreferences: user.profile.jobPreferences || {},
        isProfilePublic: user.profile.isProfilePublic,
        // Extended profile fields
        education: user.profile.education || [],
        workExperience: user.profile.workExperience || [],
        certifications: user.profile.certifications || [],
        jobTitles: user.profile.jobTitles || [],
        jobTypes: user.profile.jobTypes || [],
        workSchedule: user.profile.workSchedule || [],
        minimumBasePay: user.profile.minimumBasePay,
        relocationPreferences: user.profile.relocationPreferences || [],
        remotePreferences: user.profile.remotePreferences,
        readyToWork: user.profile.readyToWork || false,
        lastUpdated: user.profile.lastUpdated,
        // Mentor assignment fields
        grade: user.profile.grade,
        assignedMentor: mentorInfo,
        mentorAssignmentDate: user.profile.mentorAssignmentDate
      },
      quickActions: quickActions.slice(0, 4), // Show top 4 quick actions
      stats: {
        profileViews: 0,
        applicationsSubmitted: await InternshipApplication.countDocuments({ jobseekerId: user._id }),
        interviewsScheduled: 0,
        jobsSaved: 0,
        profileCompletion: user.profileCompletion
      },
      recentActivity: [], // Implement later
      recommendations: [], // Implement later
      upcomingInterviews: [] // Implement later
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data'
    });
  }
});

// @desc    Get jobseeker profile
// @route   GET /api/jobseeker/profile
// @access  Private (Jobseeker only)
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Fetch extended JobseekerProfile to expose resumeUrl and other fields
    const extendedProfile = await JobseekerProfile.findOne({ userId: req.user._id });

    // Normalize resume URL for frontend convenience
    const normalizedResumeUrl = extendedProfile?.resumeUrl || user.profile?.resume || null;

    res.json({
      success: true,
      data: {
        user,
        profileCompletion: user.profileCompletion,
        extendedProfile,
        resumeUrl: normalizedResumeUrl
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @desc    Update jobseeker profile
// @route   PUT /api/jobseeker/profile
// @access  Private (Jobseeker only)
router.put('/profile', async (req, res) => {
  try {
    console.log('📝 Profile update request received:');
    console.log('   User ID:', req.user._id);
    console.log('   Request body keys:', Object.keys(req.body));
    console.log('   Profile data:', JSON.stringify(req.body, null, 2));

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, profile } = req.body;
    const hadAssignedMentorBefore = Boolean(user.profile?.assignedMentor);

    // Update basic info
    if (name) user.name = name;

    // Update profile fields
    if (profile) {
      // Basic profile fields
      if (profile.bio !== undefined) user.profile.bio = profile.bio;
      if (profile.skills !== undefined) user.profile.skills = profile.skills;
      if (profile.experience !== undefined) user.profile.experience = profile.experience;
      if (profile.location !== undefined) user.profile.location = profile.location;
      if (profile.phone !== undefined) user.profile.phone = profile.phone;
      if (profile.resume !== undefined) user.profile.resume = profile.resume;
      if (profile.portfolio !== undefined) user.profile.portfolio = profile.portfolio;
      if (profile.profilePicture !== undefined) user.profile.profilePicture = profile.profilePicture;

      // Extended profile fields
      if (profile.education !== undefined) user.profile.education = profile.education;
      if (profile.workExperience !== undefined) user.profile.workExperience = profile.workExperience;
      if (profile.certifications !== undefined) user.profile.certifications = profile.certifications;
      if (profile.jobTitles !== undefined) user.profile.jobTitles = profile.jobTitles;
      if (profile.jobTypes !== undefined) user.profile.jobTypes = profile.jobTypes;
      if (profile.workSchedule !== undefined) user.profile.workSchedule = profile.workSchedule;
      if (profile.minimumBasePay !== undefined) user.profile.minimumBasePay = profile.minimumBasePay;
      if (profile.relocationPreferences !== undefined) user.profile.relocationPreferences = profile.relocationPreferences;
      if (profile.remotePreferences !== undefined) user.profile.remotePreferences = profile.remotePreferences;
      if (profile.readyToWork !== undefined) user.profile.readyToWork = profile.readyToWork;

      // Update social links
      if (profile.socialLinks !== undefined) {
        if (!user.profile.socialLinks) user.profile.socialLinks = {};
        if (profile.socialLinks.linkedin !== undefined) user.profile.socialLinks.linkedin = profile.socialLinks.linkedin;
        if (profile.socialLinks.github !== undefined) user.profile.socialLinks.github = profile.socialLinks.github;
        if (profile.socialLinks.twitter !== undefined) user.profile.socialLinks.twitter = profile.socialLinks.twitter;
        if (profile.socialLinks.website !== undefined) user.profile.socialLinks.website = profile.socialLinks.website;
      }

      // Update job preferences
      if (profile.jobPreferences !== undefined) {
        if (!user.profile.jobPreferences) user.profile.jobPreferences = {};
        if (profile.jobPreferences.jobType !== undefined) user.profile.jobPreferences.jobType = profile.jobPreferences.jobType;
        if (profile.jobPreferences.workMode !== undefined) user.profile.jobPreferences.workMode = profile.jobPreferences.workMode;
        if (profile.jobPreferences.availableFrom !== undefined) user.profile.jobPreferences.availableFrom = profile.jobPreferences.availableFrom;

        // Update expected salary
        if (profile.jobPreferences.expectedSalary !== undefined) {
          if (!user.profile.jobPreferences.expectedSalary) user.profile.jobPreferences.expectedSalary = {};
          if (profile.jobPreferences.expectedSalary.min !== undefined) user.profile.jobPreferences.expectedSalary.min = profile.jobPreferences.expectedSalary.min;
          if (profile.jobPreferences.expectedSalary.max !== undefined) user.profile.jobPreferences.expectedSalary.max = profile.jobPreferences.expectedSalary.max;
          if (profile.jobPreferences.expectedSalary.currency !== undefined) user.profile.jobPreferences.expectedSalary.currency = profile.jobPreferences.expectedSalary.currency;
        }
      }

      // Update profile visibility and timestamp
      if (profile.isProfilePublic !== undefined) user.profile.isProfilePublic = profile.isProfilePublic;
      user.profile.lastUpdated = new Date();
    }

    // Calculate and update profile completion
    await user.calculateProfileCompletion();

    // Save with validateModifiedOnly to avoid password validation during profile updates
    await user.save({ validateModifiedOnly: true });

    const updatedUser = await User.findById(user._id).select('-password');

    // Auto-assign mentor if grade provided/updated and no mentor assigned yet
    let mentorAssignment = null;
    try {
      const incomingGrade = profile?.grade;
      const stillUnassigned = !hadAssignedMentorBefore && !updatedUser.profile?.assignedMentor;
      if (incomingGrade && stillUnassigned) {
        const preferredCategory = profile?.preferredCategory || updatedUser.profile?.preferredCategory || null;
        mentorAssignment = await assignMentorToJobSeeker(updatedUser._id, incomingGrade, preferredCategory);
      }
    } catch (assignErr) {
      console.error('Auto-assign mentor error on profile update:', assignErr);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
        profileCompletion: updatedUser.profileCompletion,
        mentorAssignment
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      console.error('Validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors,
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @desc    Get full profile view (formatted for display)
// @route   GET /api/jobseeker/profile/view
// @access  Private (Jobseeker only)
router.get('/profile/view', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Format profile data for display
    const profileView = {
      basicInfo: {
        name: user.name,
        email: user.email,
        phone: user.profile.phone || null,
        location: user.profile.location || null,
        profilePicture: user.profile.profilePicture || null,
        memberSince: user.createdAt
      },
      professionalInfo: {
        bio: user.profile.bio || null,
        skills: user.profile.skills || [],
        experience: user.profile.experience || null,
        resume: user.profile.resume || null,
        portfolio: user.profile.portfolio || null
      },
      socialLinks: user.profile.socialLinks || {},
      jobPreferences: {
        jobType: user.profile.jobPreferences?.jobType || null,
        workMode: user.profile.jobPreferences?.workMode || null,
        expectedSalary: user.profile.jobPreferences?.expectedSalary || null,
        availableFrom: user.profile.jobPreferences?.availableFrom || null
      },
      settings: {
        isProfilePublic: user.profile.isProfilePublic || false
      },
      stats: {
        profileCompletion: user.profileCompletion,
        lastUpdated: user.profile.lastUpdated || user.updatedAt
      }
    };

    res.json({
      success: true,
      data: profileView
    });

  } catch (error) {
    console.error('Profile view error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile view'
    });
  }
});

// @desc    Get profile completion suggestions
// @route   GET /api/jobseeker/profile-suggestions
// @access  Private (Jobseeker only)
router.get('/profile-suggestions', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const suggestions = [];

    // Check what's missing and provide suggestions
    if (!user.profile.bio) {
      suggestions.push({
        field: 'bio',
        title: 'Add a Professional Bio',
        description: 'Write a brief description about yourself and your career goals',
        priority: 'high',
        weight: 15,
        icon: 'user'
      });
    }

    if (!user.profile.skills || user.profile.skills.length === 0) {
      suggestions.push({
        field: 'skills',
        title: 'Add Your Skills',
        description: 'List your technical and soft skills to help employers find you',
        priority: 'high',
        weight: 20,
        icon: 'code'
      });
    }

    if (!user.profile.phone) {
      suggestions.push({
        field: 'phone',
        title: 'Add Contact Number',
        description: 'Provide a phone number for employers to reach you',
        priority: 'medium',
        weight: 10,
        icon: 'phone'
      });
    }

    if (!user.profile.location) {
      suggestions.push({
        field: 'location',
        title: 'Add Your Location',
        description: 'Help employers find local talent by adding your location',
        priority: 'medium',
        weight: 10,
        icon: 'map-pin'
      });
    }

    if (!user.profile.resume) {
      suggestions.push({
        field: 'resume',
        title: 'Upload Your Resume',
        description: 'Upload your resume to make applications easier',
        priority: 'high',
        weight: 15,
        icon: 'file-text'
      });
    }

    if (!user.profile.portfolio) {
      suggestions.push({
        field: 'portfolio',
        title: 'Add Portfolio Link',
        description: 'Showcase your work with a portfolio or personal website',
        priority: 'medium',
        weight: 10,
        icon: 'briefcase'
      });
    }

    if (!user.profile.profilePicture) {
      suggestions.push({
        field: 'profilePicture',
        title: 'Add Profile Picture',
        description: 'Add a professional profile picture to make your profile more personal',
        priority: 'low',
        weight: 5,
        icon: 'camera'
      });
    }

    if (!user.profile.socialLinks || Object.keys(user.profile.socialLinks).length === 0) {
      suggestions.push({
        field: 'socialLinks',
        title: 'Add Social Media Links',
        description: 'Connect your LinkedIn, GitHub, or other professional profiles',
        priority: 'medium',
        weight: 10,
        icon: 'link'
      });
    }

    if (!user.profile.jobPreferences ||
      (!user.profile.jobPreferences.jobType &&
        !user.profile.jobPreferences.workMode &&
        !user.profile.jobPreferences.expectedSalary)) {
      suggestions.push({
        field: 'jobPreferences',
        title: 'Set Job Preferences',
        description: 'Specify your preferred job type, work mode, and salary expectations',
        priority: 'medium',
        weight: 5,
        icon: 'settings'
      });
    }

    if (!user.profile.experience) {
      suggestions.push({
        field: 'experience',
        title: 'Add Experience Level',
        description: 'Let employers know your experience level',
        priority: 'medium',
        weight: 8,
        icon: 'award'
      });
    }

    // Sort suggestions by priority and weight
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.weight - a.weight;
    });

    res.json({
      success: true,
      data: {
        profileCompletion: user.profileCompletion,
        suggestions,
        totalSuggestions: suggestions.length
      }
    });

  } catch (error) {
    console.error('Profile suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile suggestions'
    });
  }
});

// @desc    Get jobseeker statistics
// @route   GET /api/jobseeker/stats
// @access  Private (Jobseeker only)
router.get('/stats', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For now, returning mock data. You can expand this when you add job applications, etc.
    const stats = {
      profileViews: 0,
      applicationsSubmitted: 0,
      interviewsScheduled: 0,
      jobsSaved: 0,
      profileCompletion: user.profileCompletion,
      memberSince: user.createdAt,
      lastLogin: user.lastLogin
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

// @desc    Toggle profile visibility
// @route   PATCH /api/jobseeker/profile/visibility
// @access  Private (Jobseeker only)
router.patch('/profile/visibility', async (req, res) => {
  try {
    const { isPublic } = req.body;

    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isPublic must be a boolean value'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.profile.isProfilePublic = isPublic;
    await user.save();

    res.json({
      success: true,
      message: `Profile is now ${isPublic ? 'public' : 'private'}`,
      data: {
        isProfilePublic: user.profile.isProfilePublic
      }
    });

  } catch (error) {
    console.error('Profile visibility toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile visibility'
    });
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF and DOC files
    if (file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOC files are allowed'), false);
    }
  }
});

// POST /api/jobseeker/course/tasks/:taskId/submit-file (with file upload)
router.post('/course/tasks/:taskId/submit-file', upload.single('file'), async (req, res) => {
  try {
    const menteeId = req.user._id;
    const { taskId } = req.params;
    const { notes = '' } = req.body || {};

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const task = await MentorTask.findById(taskId).lean();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // ensure this task was assigned to this mentee
    const assigned = Array.isArray(task.assignedTo) && task.assignedTo.some((id) => id.toString() === menteeId.toString());
    if (!assigned) return res.status(403).json({ success: false, message: 'Access denied: task not assigned to you' });

    // Upload file to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'task-submissions');
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to Cloudinary',
        error: uploadResult.error
      });
    }

    const submission = await MentorSubmission.create({
      mentorId: task.mentorId,
      menteeId,
      domain: task.domain,
      title: task.title,
      taskId: task._id,
      submissionType: 'files',
      link: '',
      notes: String(notes || ''),
      files: [{
        name: req.file.originalname,
        url: uploadResult.url
      }],
      submissionVersion: 1,
      previousSubmissionId: null,
    });

    return res.status(201).json({ success: true, data: submission });
  } catch (error) {
    console.error('Course task file submit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit task with file', error: error.message });
  }
});

// POST /api/jobseeker/course/tasks/:taskId/resubmit (for rejected tasks)
router.post('/course/tasks/:taskId/resubmit', upload.single('file'), async (req, res) => {
  try {
    const menteeId = req.user._id;
    const { taskId } = req.params;
    const { link = '', notes = '' } = req.body || {};

    const task = await MentorTask.findById(taskId).lean();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Ensure task is assigned to this mentee
    const assigned = Array.isArray(task.assignedTo) && task.assignedTo.some((id) => id.toString() === menteeId.toString());
    if (!assigned) return res.status(403).json({ success: false, message: 'Access denied: task not assigned to you' });

    // Find the previous submission
    const previousSubmission = await MentorSubmission.findOne({
      menteeId,
      taskId,
      reviewStatus: 'rejected'
    }).sort({ createdAt: -1 });

    if (!previousSubmission) {
      return res.status(400).json({
        success: false,
        message: 'No rejected submission found for this task'
      });
    }

    // Handle file upload if provided
    let files = [];
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'task-submissions');
      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file to Cloudinary',
          error: uploadResult.error
        });
      }
      files = [{
        name: req.file.originalname,
        url: uploadResult.url
      }];
    }

    // Create new submission with version tracking
    const newSubmission = await MentorSubmission.create({
      mentorId: task.mentorId,
      menteeId,
      domain: task.domain,
      title: task.title,
      taskId: task._id,
      submissionType: req.file ? 'files' : 'link',
      link: String(link || ''),
      notes: String(notes || ''),
      files,
      submissionVersion: (previousSubmission.submissionVersion || 1) + 1,
      previousSubmissionId: previousSubmission._id,
      reviewStatus: 'pending',
      viewed: false
    });

    return res.status(201).json({ success: true, data: newSubmission });
  } catch (error) {
    console.error('Course task resubmit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resubmit task', error: error.message });
  }
});

// GET /api/jobseeker/course/milestones - Get milestone feedbacks for current user
router.get('/course/milestones', async (req, res) => {
  try {
    const menteeId = req.user._id;

    const feedbacks = await MilestoneFeedback.find({ menteeId })
      .populate('mentorId', 'name')
      .sort({ milestone: 1, createdAt: -1 })
      .lean();

    return res.json({ success: true, data: feedbacks });
  } catch (error) {
    console.error('Get course milestones error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load milestones', error: error.message });
  }
});

// GET /api/jobseeker/course/submissions/:submissionId/history - Get submission history for current user
router.get('/course/submissions/:submissionId/history', async (req, res) => {
  try {
    const menteeId = req.user._id;
    const { submissionId } = req.params;

    console.log('📋 History request - SubmissionId:', submissionId, 'MenteeId:', menteeId);

    // Find the submission and verify ownership
    const submission = await MentorSubmission.findOne({ _id: submissionId, menteeId });
    if (!submission) {
      console.log('❌ Submission not found for:', submissionId);
      return res.status(404).json({ success: false, message: 'Submission not found or access denied' });
    }

    console.log('✅ Found submission - TaskId:', submission.taskId, 'Version:', submission.submissionVersion);

    // Get all submissions for the same task
    const allSubmissions = await MentorSubmission.find({
      menteeId,
      taskId: submission.taskId
    }).sort({ submissionVersion: 1 });

    // Convert to plain objects and ensure all fields are included
    const historyData = allSubmissions.map(sub => ({
      _id: sub._id,
      mentorId: sub.mentorId,
      menteeId: sub.menteeId,
      domain: sub.domain,
      title: sub.title,
      taskId: sub.taskId,
      submissionType: sub.submissionType,
      link: sub.link || '',
      notes: sub.notes || '',
      files: sub.files || [],
      submissionVersion: sub.submissionVersion || 1,
      previousSubmissionId: sub.previousSubmissionId || null,
      reviewStatus: sub.reviewStatus || 'pending',
      mentorFeedback: sub.mentorFeedback || '',
      reviewedAt: sub.reviewedAt || null,
      reviewedBy: sub.reviewedBy || null,
      viewed: sub.viewed || false,
      viewedAt: sub.viewedAt || null,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt
    }));

    console.log('📦 History query returned', historyData.length, 'submissions');
    historyData.forEach(s => {
      console.log(`  - v${s.submissionVersion}: ${s._id} (${s.reviewStatus})`);
    });

    return res.json({ success: true, data: historyData });
  } catch (error) {
    console.error('Get submission history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get history', error: error.message });
  }
});

// @desc    Create jobseeker profile
// @route   POST /api/jobseeker/profile
// @access  Private (Jobseeker only)
router.post('/profile', async (req, res) => {
  try {
    const {
      education,
      skills,
      internshipTitle,
      internshipType,
      preferredLocation,
      readyToWorkAfterInternship
    } = req.body;

    // Check if profile already exists
    const existingProfile = await JobseekerProfile.findOne({ userId: req.user._id });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Profile already exists. Use PUT to update.'
      });
    }

    // Validate required fields
    if (!education || !Array.isArray(education) || education.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one education entry is required'
      });
    }

    // Create new profile
    const profile = new JobseekerProfile({
      userId: req.user._id,
      education,
      skills: skills || [],
      internshipTitle,
      internshipType,
      preferredLocation,
      readyToWorkAfterInternship: readyToWorkAfterInternship || false
    });

    await profile.save();

    // Calculate initial ATS score
    const atsResult = await updateProfileATSScore(req.user._id);

    // Update profile completion percentage in User model
    const user = await User.findById(req.user._id);
    if (user) {
      await user.calculateProfileCompletion();
      await user.save({ validateModifiedOnly: true });
    }

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: {
        profile,
        atsScore: atsResult.atsScore,
        suggestions: atsResult.suggestions,
        profileCompletion: user ? user.profileCompletion : 0
      }
    });

  } catch (error) {
    console.error('Profile creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating profile'
    });
  }
});

// @desc    Get jobseeker profile
// @route   GET /api/jobseeker/profile/:userId
// @access  Private (Jobseeker only)
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is requesting their own profile or if profile is public
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const profile = await JobseekerProfile.findOne({ userId }).populate('userId', 'name email phone');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Get user data
    const user = await User.findById(userId).select('name email phone');

    // Combine user and profile data
    const profileData = {
      ...profile.toObject(),
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    };

    res.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @desc    Update jobseeker profile
// @route   PUT /api/jobseeker/profile/:userId
// @access  Private (Jobseeker only)
router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      education,
      skills,
      internshipTitle,
      internshipType,
      preferredLocation,
      readyToWorkAfterInternship
    } = req.body;

    // Check if user is updating their own profile
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const profile = await JobseekerProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Update profile fields
    if (education) profile.education = education;
    if (skills) profile.skills = skills;
    if (internshipTitle !== undefined) profile.internshipTitle = internshipTitle;
    if (internshipType) profile.internshipType = internshipType;
    if (preferredLocation !== undefined) profile.preferredLocation = preferredLocation;
    if (readyToWorkAfterInternship !== undefined) profile.readyToWorkAfterInternship = readyToWorkAfterInternship;

    await profile.save();

    // Update ATS score
    const atsResult = await updateProfileATSScore(userId);

    // Update profile completion percentage in User model
    const user = await User.findById(userId);
    if (user) {
      await user.calculateProfileCompletion();
      await user.save({ validateModifiedOnly: true });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profile,
        atsScore: atsResult.atsScore,
        suggestions: atsResult.suggestions,
        profileCompletion: user ? user.profileCompletion : 0
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @desc    Upload resume to Cloudinary
// @route   POST /api/jobseeker/upload-resume
// @access  Private (Jobseeker only)
router.post('/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Extract text first to validate resume before uploading to Cloudinary
    let parsedText = '';
    try {
      parsedText = await extractText(req.file.buffer, req.file.mimetype);
    } catch (e) {
      console.warn('Resume text extraction failed:', e.message);
    }

    if (!isLikelyResume(parsedText)) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a valid resume (include contact, education, experience/projects, and skills)'
      });
    }

    // Upload to Cloudinary (after validation)
    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      'resumes',
      `resume_${req.user._id}_${Date.now()}`
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to Cloudinary',
        error: uploadResult.error
      });
    }

    // Find or create profile
    let profile = await JobseekerProfile.findOne({ userId: req.user._id });

    if (!profile) {
      // Create basic profile if it doesn't exist
      profile = new JobseekerProfile({
        userId: req.user._id,
        education: [],
        skills: []
      });
    }

    // Delete old resume if exists
    if (profile.resumeUrl) {
      const oldPublicId = profile.resumeUrl.split('/').pop().split('.')[0];
      await deleteFromCloudinary(oldPublicId);
    }

    // Update profile with new resume URL
    profile.resumeUrl = uploadResult.url;
    await profile.save();

    // We already have parsedText; proceed to extract entities
    const extracted = extractEntities(parsedText);

    // Save NLP analysis and compute NLP ATS, keep previous snapshot for comparison
    const prevNlp = (await JobseekerProfile.findOne({ userId: req.user._id }))?.nlp || null;
    const nlpResult = await analyzeAndSaveNLP(req.user._id, parsedText, extracted);
    const profileAfter = await JobseekerProfile.findOne({ userId: req.user._id });
    if (profileAfter?.nlp) {
      profileAfter.nlp.history = profileAfter.nlp.history || [];
      profileAfter.nlp.history.push({ analyzedAt: new Date(), score: profileAfter.nlp.atsNLP?.score || 0, details: profileAfter.nlp.atsNLP?.details || {} });
      await profileAfter.save();
    }

    // Update rule-based ATS score for backward compatibility
    const atsResult = await updateProfileATSScore(req.user._id);

    // Update profile completion percentage in User model
    const user = await User.findById(req.user._id);
    if (user) {
      await user.calculateProfileCompletion();
      await user.save({ validateModifiedOnly: true });
    }

    res.json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resumeUrl: uploadResult.url,
        atsScore: atsResult.atsScore,
        atsNLP: nlpResult.success ? nlpResult.atsNLP : undefined,
        comparison: prevNlp && nlpResult.success && nlpResult.atsNLP ? {
          previousScore: prevNlp.atsNLP?.score || 0,
          currentScore: nlpResult.atsNLP.score,
          delta: (nlpResult.atsNLP.score - (prevNlp.atsNLP?.score || 0))
        } : undefined,
        suggestions: atsResult.suggestions,
        profileCompletion: user ? user.profileCompletion : 0
      }
    });

  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading resume'
    });
  }
});

// @desc    NLP ATS score (optionally against job description)
// @route   POST /api/jobseeker/ats-nlp
// @access  Private (Jobseeker only)
router.post('/ats-nlp', async (req, res) => {
  try {
    const { jobDescription } = req.body || {};
    const profile = await JobseekerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const { score, details, suggestions } = await computeNLPScore(profile, jobDescription || '');
    res.json({
      success: true,
      data: {
        atsNLP: { score, details, suggestions },
        lastAnalyzedAt: profile?.nlp?.lastAnalyzedAt || null
      }
    });
  } catch (error) {
    console.error('NLP ATS error:', error);
    res.status(500).json({ success: false, message: 'Server error while computing NLP ATS' });
  }
});

// @desc    Re-run NLP parsing on current resume file in Cloudinary (pull via URL not implemented here)
//          Intended for cases where external NLP service changed.
// @route   POST /api/jobseeker/reanalyze-nlp
// @access  Private (Jobseeker only)
router.post('/reanalyze-nlp', async (req, res) => {
  try {
    const profile = await JobseekerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    if (!profile.resumeUrl) {
      return res.status(400).json({ success: false, message: 'No resume on file' });
    }
    // For simplicity, we do not re-download Cloudinary file here.
    // Expect client to re-upload if text extraction needs refresh.
    return res.status(200).json({ success: true, message: 'No-op. Please re-upload resume to re-parse.' });
  } catch (error) {
    console.error('Reanalyze NLP error:', error);
    res.status(500).json({ success: false, message: 'Server error while reanalyzing NLP' });
  }
});

// @desc    Get ATS score and suggestions
// @route   GET /api/jobseeker/ats-score
// @access  Private (Jobseeker only)
router.get('/ats-score', async (req, res) => {
  try {
    const profile = await JobseekerProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const suggestions = generateATSSuggestions(profile);

    res.json({
      success: true,
      data: {
        atsScore: profile.atsScore,
        suggestions,
        profileCompletion: profile.profileCompletion
      }
    });

  } catch (error) {
    console.error('ATS score fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching ATS score'
    });
  }
});

// @desc    Get all available internship postings with search and filters
// @route   GET /api/jobseeker/internships
// @access  Private (Jobseeker only)
router.get('/internships', async (req, res) => {
  try {
    const {
      search,
      industry,
      location,
      mode,
      duration,
      page = 1,
      limit = 10,
      sortBy = 'postedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filters = { status: 'active' };

    // Only include internships whose last application date is today or later
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    filters.lastDateToApply = { $gte: startOfToday };

    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { skillsRequired: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (industry) {
      filters.industry = industry;
    }

    if (location) {
      filters.location = { $regex: location, $options: 'i' };
    }

    if (mode) {
      filters.mode = mode;
    }

    if (duration) {
      filters.duration = duration;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await InternshipPosting.countDocuments(filters);

    // Get internships with pagination
    const internships = await InternshipPosting.find(filters)
      .populate('employerId', 'name company.name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-applications'); // Don't include applications for jobseekers

    // Format response
    const formattedInternships = internships.map(internship => ({
      _id: internship._id,
      title: internship.title,
      companyName: internship.companyName || (internship.employerId?.company?.name || internship.employerId?.name || 'Company'),
      industry: internship.industry,
      location: internship.location,
      mode: internship.mode,
      startDate: internship.startDate,
      lastDateToApply: internship.lastDateToApply,
      duration: internship.duration,
      totalSeats: internship.totalSeats,
      availableSeats: internship.availableSeats,
      description: internship.description,
      skillsRequired: internship.skillsRequired,
      certifications: internship.certifications,
      eligibility: internship.eligibility,
      stipend: internship.stipend,
      benefits: internship.benefits,
      postedAt: internship.postedAt,
      isAcceptingApplications: internship.isAcceptingApplications(),
      // Final day flag: if today is the last application date
      isFinalDay: (function () {
        const now = new Date();
        const last = new Date(internship.lastDateToApply);
        const start = new Date(last); start.setHours(0, 0, 0, 0);
        const end = new Date(last); end.setHours(23, 59, 59, 999);
        return now >= start && now <= end;
      })(),
      // Keep legacy field but compute against end-of-day
      daysLeftToApply: (function () {
        const now = new Date();
        const end = new Date(internship.lastDateToApply); end.setHours(23, 59, 59, 999);
        const diff = end - now; return Math.ceil(diff / (1000 * 60 * 60 * 24));
      })()
    }));

    res.json({
      success: true,
      data: {
        internships: formattedInternships,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching internships:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching internships'
    });
  }
});

// @desc    Get internship posting details by ID
// @route   GET /api/jobseeker/internships/:id
// @access  Private (Jobseeker only)
router.get('/internships/:id', async (req, res) => {
  try {
    const internship = await InternshipPosting.findById(req.params.id)
      .populate('employerId', 'name company.name company.description company.website')
      .select('-applications');

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship posting not found'
      });
    }

    if (internship.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This internship posting is not currently active'
      });
    }

    const formattedInternship = {
      _id: internship._id,
      title: internship.title,
      companyName: internship.companyName || (internship.employerId?.company?.name || internship.employerId?.name || 'Company'),
      companyDescription: internship.employerId?.company?.description,
      companyWebsite: internship.employerId?.company?.website,
      industry: internship.industry,
      location: internship.location,
      mode: internship.mode,
      startDate: internship.startDate,
      lastDateToApply: internship.lastDateToApply,
      duration: internship.duration,
      totalSeats: internship.totalSeats,
      availableSeats: internship.availableSeats,
      description: internship.description,
      skillsRequired: internship.skillsRequired,
      certifications: internship.certifications,
      eligibility: internship.eligibility,
      stipend: internship.stipend,
      benefits: internship.benefits,
      postedAt: internship.postedAt,
      isAcceptingApplications: internship.isAcceptingApplications(),
      daysLeftToApply: Math.ceil((new Date(internship.lastDateToApply) - new Date()) / (1000 * 60 * 60 * 24))
    };

    res.json({
      success: true,
      data: formattedInternship
    });

  } catch (error) {
    console.error('Error fetching internship details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching internship details'
    });
  }
});

// @desc    Apply for an internship (with auto-filtering)
// @route   POST /api/jobseeker/internships/:id/apply
// @access  Private (Jobseeker only)
router.post('/internships/:id/apply', async (req, res) => {
  try {
    const { coverLetter } = req.body;

    const internship = await InternshipPosting.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship posting not found'
      });
    }

    if (internship.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This internship posting is not currently active'
      });
    }

    if (!internship.isAcceptingApplications()) {
      return res.status(400).json({
        success: false,
        message: 'Applications are no longer being accepted for this internship'
      });
    }

    // Check if already applied
    const alreadyApplied = internship.applications.some(
      app => app.jobseekerId.toString() === req.user._id.toString()
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this internship'
      });
    }

    // Get user's resume URL
    const userProfile = await JobseekerProfile.findOne({ userId: req.user._id });
    const resumeUrl = userProfile?.resumeUrl;

    if (!resumeUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your resume before applying for internships'
      });
    }

    // Build centralized detailed application and compute matching
    const profile = await JobseekerProfile.findOne({ userId: req.user._id });
    const { extractPostingCriteria, extractApplicant, computeMatchScore, decideAction, buildSummary } = require('../utils/matching');

    const criteria = extractPostingCriteria(internship);

    // Prepare application data for contact info extraction
    const applicationDataForMatching = {
      personalDetails: {
        emailAddress: req.user.email,
        contactNumber: req.user.phone || '',
        linkedinProfile: req.user.profile?.socialLinks?.linkedin || '',
        githubPortfolio: req.user.profile?.socialLinks?.github || ''
      }
    };

    const applicant = extractApplicant(profile || {}, req.user, applicationDataForMatching);
    const { score, matched, unmatched } = computeMatchScore(criteria, applicant);
    const decision = decideAction(score, 55);

    const application = new InternshipApplication({
      internshipId: internship._id,
      jobseekerId: req.user._id,
      employerId: internship.employerId,
      internshipDetails: {
        title: internship.title,
        type: internship.stipend?.type === 'Unpaid' ? 'Unpaid' : 'Paid',
        duration: internship.duration,
        startDate: internship.startDate,
        workMode: internship.mode,
        eligibility: (/freshers/i.test(internship.eligibility) ? 'Freshers Only' : /experience|experienced/i.test(internship.eligibility) ? 'Experienced Only' : 'Both')
      },
      personalDetails: {
        fullName: req.user.name || 'Applicant',
        dateOfBirth: new Date(0),
        gender: 'Other',
        contactNumber: req.user.phone || 'NA',
        emailAddress: req.user.email,
        linkedinProfile: req.user.profile?.socialLinks?.linkedin || '',
        githubPortfolio: req.user.profile?.socialLinks?.github || ''
      },
      educationDetails: {
        highestQualification: (profile?.education?.[0]?.degree || 'NA'),
        institutionName: (profile?.education?.[0]?.institution || 'NA'),
        yearOfGraduation: parseInt((profile?.education?.[0]?.year || '0')) || new Date().getFullYear(),
        cgpaPercentage: ''
      },
      workExperience: {},
      skills: {
        technicalSkills: profile?.skills || [],
        softSkills: []
      },
      projects: [],
      additionalInfo: {
        whyJoinInternship: coverLetter || '',
        achievementsCertifications: '',
        resumeUrl: resumeUrl,
        portfolioUrl: ''
      },
      declarations: {
        informationTruthful: true,
        consentToShare: true
      },
      status: decision === 'Proceed to Recruiter' ? 'shortlisted' : 'rejected',
      matchScore: score,
      matching: { matched, unmatched },
      decision,
      summary: buildSummary(req.user.name, score, matched, unmatched)
    });

    await application.save();

    // Fire-and-forget notification email to jobseeker based on auto-decision
    try {
      const companyName = internship.companyName || 'Our Company';
      const internshipTitle = internship.title || 'Internship';
      const toEmail = req.user.email;
      const toName = req.user.name || 'Candidate';
      if (decision === 'Proceed to Recruiter') {
        // Shortlisted template
        await sendShortlistEmail(toEmail, toName, companyName, internshipTitle);
      } else if (decision === 'Auto-Rejected') {
        // Rejected template as requested
        const subject = 'Internship Application Status – Rejected';
        const message = `
          <p>Dear ${toName},</p>
          <p>We regret to inform you that your internship application has been auto-rejected. Thank you for your interest in joining <strong>${companyName}</strong>. We encourage you to apply for future opportunities that match your skills and experience.</p>
          <p>Best regards,<br/>${companyName} Team</p>
        `;
        const { sendNotificationEmail } = require('../utils/emailService');
        await sendNotificationEmail(toEmail, subject, message);
      }
    } catch (emailErr) {
      console.error('Auto-decision email error (apply):', emailErr.message);
    }

    // Maintain backward compatibility array on posting
    internship.applications.push({
      jobseekerId: req.user._id,
      appliedAt: new Date(),
      status: application.status,
      resumeUrl,
      coverLetter: coverLetter || ''
    });
    internship.applicationsCount = internship.applications.length;
    internship.availableSeats = Math.max(0, internship.availableSeats - 1);
    await internship.save();

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId: application._id,
        matchScore: score,
        decision,
        summary: application.summary,
        appliedAt: application.appliedAt
      }
    });

  } catch (error) {
    console.error('Error applying for internship:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting application'
    });
  }
});

// @desc    Get user's internship applications
// @route   GET /api/jobseeker/applications
// @access  Private (Jobseeker only)
router.get('/applications', async (req, res) => {
  try {
    const applications = await InternshipPosting.find({
      'applications.jobseekerId': req.user._id
    })
      .populate('employerId', 'name company.name')
      .select('title companyName applications.$');

    const formattedApplications = applications.map(internship => {
      const application = internship.applications.find(
        app => app.jobseekerId.toString() === req.user._id.toString()
      );

      const normalizedStatus = (application.status === 'reviewed' && application.decision === 'Proceed to Recruiter') ? 'shortlisted' : application.status;

      return {
        _id: application._id,
        internshipId: internship._id,
        title: internship.title,
        companyName: internship.companyName || (internship.employerId?.company?.name || internship.employerId?.name || 'Company'),
        appliedAt: application.appliedAt,
        status: normalizedStatus,
        coverLetter: application.coverLetter,
        resumeUrl: application.resumeUrl,
        internship: {
          location: internship.location,
          mode: internship.mode,
          duration: internship.duration,
          startDate: internship.startDate
        }
      };
    });

    res.json({
      success: true,
      data: formattedApplications
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching applications'
    });
  }
});

// @desc    Apply for an internship with detailed form
// @route   POST /api/jobseeker/internships/:id/apply-detailed
// @access  Private (Jobseeker only)
router.post('/internships/:id/apply-detailed', async (req, res) => {
  try {
    const InternshipApplication = require('../models/InternshipApplication');
    const { extractPostingCriteria, extractApplicant, computeMatchScore, decideAction, buildSummary } = require('../utils/matching');
    const applicationData = req.body;

    const internship = await InternshipPosting.findById(req.params.id);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship posting not found'
      });
    }

    if (internship.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This internship posting is not currently active'
      });
    }

    if (!internship.isAcceptingApplications()) {
      return res.status(400).json({
        success: false,
        message: 'Applications are no longer being accepted for this internship'
      });
    }

    // Check if already applied
    const existingApplication = await InternshipApplication.findOne({
      internshipId: req.params.id,
      jobseekerId: req.user._id
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this internship'
      });
    }

    // Normalize eligibility to model enum
    const allowedEligibility = ['Freshers Only', 'Experienced Only', 'Both'];
    const normalizedEligibility = allowedEligibility.includes(applicationData?.internshipDetails?.eligibility)
      ? applicationData.internshipDetails.eligibility
      : 'Both';

    // Create detailed application
    const application = new InternshipApplication({
      internshipId: req.params.id,
      jobseekerId: req.user._id,
      employerId: internship.employerId,
      internshipDetails: {
        ...applicationData.internshipDetails,
        eligibility: normalizedEligibility
      },
      personalDetails: applicationData.personalDetails,
      educationDetails: applicationData.educationDetails,
      workExperience: applicationData.workExperience,
      skills: applicationData.skills,
      projects: applicationData.projects,
      additionalInfo: applicationData.additionalInfo,
      declarations: applicationData.declarations
    });

    // Auto-match using applicant profile
    const profile = await JobseekerProfile.findOne({ userId: req.user._id });
    const criteria = extractPostingCriteria(internship);
    // Pass application data for contact info extraction
    const applicant = extractApplicant(profile || {}, req.user, applicationData);
    const { score, matched, unmatched } = computeMatchScore(criteria, applicant);
    const decision = decideAction(score, 55);

    application.matchScore = score;
    application.matching = { matched, unmatched };
    application.decision = decision;
    application.status = decision === 'Proceed to Recruiter' ? 'shortlisted' : 'rejected';
    application.summary = buildSummary(req.user.name, score, matched, unmatched);

    await application.save();

    // Fire-and-forget notification email to jobseeker based on auto-decision (detailed)
    try {
      const companyName = internship.companyName || 'Our Company';
      const internshipTitle = internship.title || 'Internship';
      const toEmail = req.user.email;
      const toName = req.user.name || 'Candidate';
      if (decision === 'Proceed to Recruiter') {
        await sendShortlistEmail(toEmail, toName, companyName, internshipTitle);
      } else if (decision === 'Auto-Rejected') {
        await sendRejectionEmail(toEmail, toName, companyName, internshipTitle);
      }
    } catch (emailErr) {
      console.error('Auto-decision email error (apply-detailed):', emailErr.message);
    }

    // Also add to the internship's applications array for backward compatibility
    internship.applications.push({
      jobseekerId: req.user._id,
      appliedAt: new Date(),
      status: application.status,
      resumeUrl: applicationData.additionalInfo.resumeUrl,
      coverLetter: applicationData.additionalInfo.whyJoinInternship
    });

    internship.applicationsCount = internship.applications.length;
    internship.availableSeats = Math.max(0, internship.availableSeats - 1);

    await internship.save();

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId: application._id,
        appliedAt: application.appliedAt
      }
    });

  } catch (error) {
    console.error('Error submitting detailed application:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed while submitting application',
        errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while submitting application'
    });
  }
});

// @desc    Get detailed applications for jobseeker
// @route   GET /api/jobseeker/applications-detailed
// @access  Private (Jobseeker only)
router.get('/applications-detailed', async (req, res) => {
  try {
    const applications = await InternshipApplication.getApplicationsForJobseeker(req.user._id);

    // Helper to calculate end date from start date and duration string
    const calculateEndDate = (startDate, duration) => {
      if (!startDate || !duration) return null;
      const start = new Date(startDate);
      const end = new Date(start);
      const durationMatch = duration.match(/(\d+)\s*(day|month|year|s)/i);
      if (!durationMatch) return null;
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      switch (unit) {
        case 'day': case 'days': end.setDate(start.getDate() + value); break;
        case 'month': case 'months': end.setMonth(start.getMonth() + value); break;
        case 'year': case 'years': end.setFullYear(start.getFullYear() + value); break;
        default: return null;
      }
      return end;
    };

    // Dynamically compute 'incomplete' status for applications whose internship has ended
    // but no tasks were assigned or no submissions were made (mirrors mentor dashboard logic)
    const now = new Date();
    for (const app of applications) {
      // Only check apps that are still marked as active/selected (not yet resolved)
      if (!['selected', 'active'].includes(app.status)) continue;
      if (!app.mentorId) continue; // No mentor assigned, skip

      // Calculate end date
      const startDate = app.internshipDetails?.startDate || app.internshipId?.startDate;
      const duration = app.internshipDetails?.duration || app.internshipId?.duration;
      const endDate = calculateEndDate(startDate, duration);

      if (!endDate || now <= endDate) continue; // Internship hasn't ended yet

      // Internship has ended — check task/submission counts
      const mentorId = app.mentorId._id || app.mentorId;
      const jobseekerId = req.user._id;

      const taskCount = await MentorTask.countDocuments({
        mentorId: mentorId,
        assignedTo: jobseekerId
      });

      const submissionCount = await MentorSubmission.countDocuments({
        mentorId: mentorId,
        menteeId: jobseekerId
      });

      // No tasks assigned OR no submissions made → incomplete
      if (taskCount === 0 || submissionCount === 0) {
        try {
          app.status = 'incomplete';
          await app.save();
          console.log(`Application ${app._id} status updated to 'incomplete' (jobseeker fetch: no tasks/submissions after end date)`);
        } catch (saveErr) {
          console.error(`Failed to update application ${app._id} status:`, saveErr.message);
        }
      } else {
        // Tasks and submissions exist, mark as completed
        try {
          app.status = 'completed';
          await app.save();
          console.log(`Application ${app._id} status updated to 'completed' (jobseeker fetch: tasks/submissions present after end date)`);
        } catch (saveErr) {
          console.error(`Failed to update application ${app._id} status:`, saveErr.message);
        }
      }
    }

    console.log('--- DEBUG: Applications Detailed Fetch ---');
    applications.forEach(app => {
      console.log(`App: ${app.internshipDetails?.title || 'Untitled'} (${app.employerId?.company?.name || 'NoCompany'})`);
      console.log(`   Status: ${app.status}`);
      console.log(`   MentorId Field:`, app.mentorId);
      if (app.mentorId) {
        console.log(`   Populated Mentor: ${app.mentorId.name || 'N/A'} (Grade ${app.mentorId.mentorProfile?.grade || 'N/A'})`);
      } else {
        console.log(`   No Mentor Assigned on App`);
      }
    });

    // Global mentor is deprecated.
    const assignedMentor = null;

    res.json({
      success: true,
      data: applications,
      assignedMentor // Sending null explicitly to clear any legacy frontend state
    });

  } catch (error) {
    console.error('Error fetching detailed applications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching applications'
    });
  }
});

// @desc    Delete a jobseeker's application (and related artifacts)
// @route   DELETE /api/jobseeker/applications/:applicationId
// @access  Private (Jobseeker only)
router.delete('/applications/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await InternshipApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (application.jobseekerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this application' });
    }

    // Remove legacy entry from InternshipPosting.applications array if present
    try {
      await InternshipPosting.updateOne(
        { _id: application.internshipId },
        { $pull: { applications: { jobseekerId: application.jobseekerId } } }
      );
    } catch (_) { }

    // Delete any assigned tests for this application
    try {
      const Test = require('../models/Test');
      await Test.deleteMany({ applicationId: application._id });
    } catch (_) { }

    // Delete the application
    await application.deleteOne();

    return res.json({ success: true, message: 'Application deleted successfully' });
  } catch (err) {
    console.error('Delete application error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete application' });
  }
});

// @desc    Get test details for a jobseeker's application
// @route   GET /api/jobseeker/applications/:applicationId/test-details
// @access  Private (Jobseeker only)
router.get('/applications/:applicationId/test-details', async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Find the application
    const application = await InternshipApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Check if user owns this application
    if (application.jobseekerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this test' });
    }

    // Find the test document
    const Test = require('../models/Test');
    const testDoc = await Test.findOne({ applicationId: application._id });

    if (!testDoc) {
      return res.status(404).json({ success: false, message: 'No test found for this application' });
    }

    // Only allow viewing if test has been submitted (any submission signal), expired, or if application is rejected with a score
    const now = new Date();
    const isExpired = testDoc.testExpiry ? now > new Date(testDoc.testExpiry) : false;
    // Treat as submitted if either Test doc OR Application doc carries submission signals
    const isSubmitted = !!testDoc.submittedAt || !!testDoc.result || typeof testDoc.score === 'number' || (Array.isArray(testDoc.answers) && testDoc.answers.length > 0)
      || !!application.result || typeof application.score === 'number' || (Array.isArray(application.answers) && application.answers.length > 0);
    const isRejectedWithScore = application.status === 'rejected' && application.score !== null;

    if (!isSubmitted && !isExpired && !isRejectedWithScore) {
      return res.status(400).json({ success: false, message: 'Test details are only available after submission, expiry, or for rejected applications with scores' });
    }

    // Prepare test details with questions, answers, and solutions
    const testDetails = {
      applicationId: application._id,
      // Try to use populated internship title if available, fallback gracefully
      internshipTitle: application.internshipId?.title || application.internshipDetails?.title || 'Internship',
      score: testDoc.score,
      result: testDoc.result,
      submittedAt: testDoc.submittedAt,
      questions: testDoc.questions || [],
      answers: testDoc.answers || [],
      correctness: testDoc.correctness || [],
      solutions: (testDoc.questions || []).map(q => {
        if (!q) return { correctAnswer: null };
        const t = q.type || 'text';
        if (t === 'mcq' || t === 'oneword') {
          return { correctAnswer: q.answerKey ?? null };
        }
        return { correctAnswer: null };
      })
    };

    res.json({
      success: true,
      data: testDetails
    });

  } catch (error) {
    console.error('Error fetching test details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching test details'
    });
  }
});

// ==================== NOTIFICATIONS ====================
// GET /api/jobseeker/notifications
// Returns mentor feedback + scheduled meetings as notifications for the Bell icon
router.get('/notifications', async (req, res) => {
  try {
    const menteeId = req.user._id;

    // Fetch feedback and meetings in parallel
    const [feedbacks, meetings] = await Promise.all([
      MilestoneFeedback.find({ menteeId })
        .populate('mentorId', 'name email profile.profilePicture')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      MentorMeeting.find({ targetMentees: menteeId, status: 'scheduled' })
        .populate('mentorId', 'name email profile.profilePicture')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    const feedbackNotifs = feedbacks.map(fb => ({
      _id: fb._id,
      type: 'feedback',
      title: `Mentor Feedback — ${fb.domain}`,
      message: fb.feedback,
      rating: fb.rating,
      milestone: fb.milestone,
      domain: fb.domain,
      mentorName: fb.mentorId?.name || 'Mentor',
      mentorEmail: fb.mentorId?.email || '',
      mentorAvatar: fb.mentorId?.profile?.profilePicture || null,
      progress: fb.progressSnapshot,
      tasksSummary: fb.tasksSummary,
      createdAt: fb.createdAt,
      updatedAt: fb.updatedAt
    }));

    const meetingNotifs = meetings.map(mt => ({
      _id: mt._id,
      type: 'meeting',
      title: mt.title,
      message: mt.message || '',
      domain: mt.domain,
      dateTime: mt.dateTime,
      link: mt.link,
      status: mt.status,
      mentorName: mt.mentorId?.name || 'Mentor',
      mentorEmail: mt.mentorId?.email || '',
      mentorAvatar: mt.mentorId?.profile?.profilePicture || null,
      createdAt: mt.createdAt,
      updatedAt: mt.updatedAt
    }));

    // Merge and sort by createdAt descending
    const notifications = [...feedbackNotifs, ...meetingNotifs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 30);

    res.json({
      success: true,
      data: notifications,
      unreadCount: notifications.length
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});
// ==================== FEEDBACK & CERTIFICATE ====================

// @desc    Check if feedback has been submitted for an application
// @route   GET /api/jobseeker/feedback/:applicationId
// @access  Private (Jobseeker only)
router.get('/feedback/:applicationId', async (req, res) => {
  try {
    const JobseekerFeedback = require('../models/JobseekerFeedback');
    const { applicationId } = req.params;

    const application = await InternshipApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (application.jobseekerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const feedback = await JobseekerFeedback.findOne({ applicationId });

    res.json({
      success: true,
      data: {
        feedbackSubmitted: !!feedback,
        feedback: feedback || null
      }
    });
  } catch (error) {
    console.error('Error checking feedback status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Submit jobseeker feedback for a completed internship
// @route   POST /api/jobseeker/feedback
// @access  Private (Jobseeker only)
router.post('/feedback', async (req, res) => {
  try {
    const JobseekerFeedback = require('../models/JobseekerFeedback');
    const {
      applicationId,
      ratings,
      feedback,
      wouldRecommend,
      declarationAccepted
    } = req.body;

    // Validate application
    const application = await InternshipApplication.findById(applicationId)
      .populate('internshipId', 'title companyName startDate duration')
      .populate('mentorId', 'name');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (application.jobseekerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (application.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Feedback can only be submitted for completed internships' });
    }

    // Check if feedback already submitted
    const existingFeedback = await JobseekerFeedback.findOne({ applicationId });
    if (existingFeedback) {
      return res.status(400).json({ success: false, message: 'Feedback has already been submitted for this application' });
    }

    // Validate ratings
    const requiredRatings = ['overallExperience', 'mentorSupport', 'learningOutcome', 'taskRelevance', 'platformExperience'];
    for (const key of requiredRatings) {
      const val = ratings?.[key];
      if (!val || val < 1 || val > 5) {
        return res.status(400).json({ success: false, message: `Rating "${key}" is required and must be between 1 and 5` });
      }
    }

    // Validate text fields
    if (!feedback?.whatWentWell || feedback.whatWentWell.trim().length < 10) {
      return res.status(400).json({ success: false, message: '"What went well" must be at least 10 characters' });
    }
    if (!feedback?.areasOfImprovement || feedback.areasOfImprovement.trim().length < 10) {
      return res.status(400).json({ success: false, message: '"Areas of improvement" must be at least 10 characters' });
    }
    if (typeof wouldRecommend !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Recommendation field is required' });
    }
    if (!declarationAccepted) {
      return res.status(400).json({ success: false, message: 'You must accept the declaration' });
    }

    // Calculate completion date
    const calculateEndDate = (startDate, duration) => {
      if (!startDate || !duration) return null;
      const start = new Date(startDate);
      const end = new Date(start);
      const durationMatch = duration.match(/(\d+)\s*(day|month|year|s)/i);
      if (!durationMatch) return null;
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      switch (unit) {
        case 'day': case 'days': end.setDate(start.getDate() + value); break;
        case 'month': case 'months': end.setMonth(start.getMonth() + value); break;
        case 'year': case 'years': end.setFullYear(start.getFullYear() + value); break;
        default: return null;
      }
      return end;
    };

    const completionDate = calculateEndDate(
      application.internshipId?.startDate || application.internshipDetails?.startDate,
      application.internshipId?.duration || application.internshipDetails?.duration
    );

    // Create feedback
    const newFeedback = new JobseekerFeedback({
      applicationId,
      jobseekerId: req.user._id,
      internshipId: application.internshipId?._id || application.internshipId,
      mentorId: application.mentorId?._id || application.mentorId || null,
      internshipSnapshot: {
        title: application.internshipId?.title || application.internshipDetails?.title || 'Internship',
        companyName: application.internshipId?.companyName || 'Company',
        mentorName: application.mentorId?.name || 'N/A',
        duration: application.internshipId?.duration || application.internshipDetails?.duration || 'N/A',
        completionDate
      },
      ratings,
      feedback: {
        whatWentWell: feedback.whatWentWell.trim(),
        areasOfImprovement: feedback.areasOfImprovement.trim(),
        additionalComments: feedback.additionalComments?.trim() || ''
      },
      wouldRecommend,
      declarationAccepted
    });

    await newFeedback.save();

    // Update application to mark feedback as submitted
    application.feedbackSubmitted = true;
    await application.save();

    console.log(`Jobseeker feedback submitted for application ${applicationId} by user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Feedback submitted successfully. You can now download your certificate.',
      data: newFeedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    res.status(500).json({ success: false, message: 'Server error while submitting feedback' });
  }
});

// @desc    Generate and download completion certificate
// @route   GET /api/jobseeker/certificate/:applicationId
// @access  Private (Jobseeker only)
router.get('/certificate/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await InternshipApplication.findById(applicationId)
      .populate('internshipId', 'title companyName startDate duration')
      .populate('mentorId', 'name')
      .populate('jobseekerId', 'name email');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (application.jobseekerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (application.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Certificate is only available for completed internships' });
    }
    if (!application.feedbackSubmitted) {
      return res.status(400).json({ success: false, message: 'Please submit your feedback first to unlock the certificate' });
    }

    // Build certificate data
    const studentName = application.jobseekerId?.name || application.personalDetails?.fullName || 'Student';
    const internshipTitle = application.internshipId?.title || application.internshipDetails?.title || 'Internship';
    const companyName = application.internshipId?.companyName || 'Company';
    const duration = application.internshipId?.duration || application.internshipDetails?.duration || 'N/A';
    const mentorName = application.mentorId?.name || 'N/A';

    // Calculate dates
    const calculateEndDate = (startDate, dur) => {
      if (!startDate || !dur) return null;
      const start = new Date(startDate);
      const end = new Date(start);
      const durationMatch = dur.match(/(\d+)\s*(day|month|year|s)/i);
      if (!durationMatch) return null;
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      switch (unit) {
        case 'day': case 'days': end.setDate(start.getDate() + value); break;
        case 'month': case 'months': end.setMonth(start.getMonth() + value); break;
        case 'year': case 'years': end.setFullYear(start.getFullYear() + value); break;
        default: return null;
      }
      return end;
    };

    const startDate = application.internshipId?.startDate || application.internshipDetails?.startDate;
    const endDate = calculateEndDate(startDate, duration);
    const startStr = startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';
    const endStr = endDate ? endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';
    const issueDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const certId = `CERT-${applicationId.toString().slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Generate HTML certificate
    const certificateHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate of Completion - ${studentName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f0f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 10px; font-family: 'Inter', sans-serif; }
    .certificate-wrapper {
      width: 1000px;
      height: 680px;
      background: white;
      position: relative;
      overflow: hidden;
    }
    .certificate {
      width: 100%;
      height: 100%;
      padding: 32px 50px 24px;
      position: relative;
      border: 3px solid #1a365d;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .certificate::before { content: ''; position: absolute; top: 6px; left: 6px; right: 6px; bottom: 6px; border: 1.5px solid #c9a84c; pointer-events: none; z-index: 1; }
    .corner-ornament { position: absolute; width: 50px; height: 50px; z-index: 2; }
    .corner-ornament.tl { top: 12px; left: 12px; border-top: 3px solid #c9a84c; border-left: 3px solid #c9a84c; }
    .corner-ornament.tr { top: 12px; right: 12px; border-top: 3px solid #c9a84c; border-right: 3px solid #c9a84c; }
    .corner-ornament.bl { bottom: 12px; left: 12px; border-bottom: 3px solid #c9a84c; border-left: 3px solid #c9a84c; }
    .corner-ornament.br { bottom: 12px; right: 12px; border-bottom: 3px solid #c9a84c; border-right: 3px solid #c9a84c; }

    .content { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }

    .logo-area { font-size: 11px; color: #64748b; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 6px; font-weight: 500; }
    .title { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 700; color: #1a365d; margin-bottom: 2px; letter-spacing: 2px; }
    .subtitle { font-size: 12px; color: #c9a84c; letter-spacing: 5px; text-transform: uppercase; font-weight: 500; }
    .divider { width: 100px; height: 2px; background: linear-gradient(to right, transparent, #c9a84c, transparent); margin: 14px auto; }
    .presented-to { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 8px; }
    .student-name { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 600; color: #1a365d; margin-bottom: 10px; border-bottom: 2px solid #c9a84c; display: inline-block; padding-bottom: 4px; }
    .description { font-size: 12px; color: #475569; line-height: 1.7; max-width: 620px; margin: 0 auto 16px; }
    .description strong { color: #1a365d; font-weight: 600; }

    .details-grid { display: flex; justify-content: center; gap: 16px; margin-bottom: 0; }
    .detail-item { text-align: center; padding: 7px 20px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; min-width: 140px; }
    .detail-label { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px; }
    .detail-value { font-size: 11px; color: #1a365d; font-weight: 600; }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 10px;
      margin-top: auto;
      flex-shrink: 0;
    }
    .signature-block { text-align: center; width: 200px; }
    .signature-svg { display: block; margin: 0 auto 2px; }
    .signature-line { width: 170px; height: 1.5px; background: linear-gradient(to right, transparent, #1a365d, transparent); margin: 0 auto 4px; }
    .signature-name { font-size: 11px; color: #1a365d; font-weight: 600; letter-spacing: 0.5px; }
    .signature-title { font-size: 9px; color: #94a3b8; margin-top: 1px; }

    .seal-container { text-align: center; flex-shrink: 0; }
    .gold-seal { width: 65px; height: 65px; margin: 0 auto; }
    .gold-seal svg { filter: drop-shadow(0 2px 4px rgba(201, 168, 76, 0.3)); }
    .seal-text { font-size: 8px; color: #94a3b8; margin-top: 3px; letter-spacing: 1px; text-transform: uppercase; }

    .cert-id { text-align: center; font-size: 8px; color: #cbd5e1; margin-top: 8px; letter-spacing: 1px; flex-shrink: 0; }

    @media print {
      body { background: white; padding: 0; }
      .certificate-wrapper { box-shadow: none; }
      .no-print { display: none !important; }
    }
    .print-btn { display: block; margin: 20px auto; padding: 12px 32px; background: #1a365d; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; letter-spacing: 1px; }
    .print-btn:hover { background: #2d4a7c; }
  </style>
</head>
<body>
  <div>
    <div class="certificate-wrapper">
      <div class="certificate">
        <div class="corner-ornament tl"></div>
        <div class="corner-ornament tr"></div>
        <div class="corner-ornament bl"></div>
        <div class="corner-ornament br"></div>

        <!-- Main Content (vertically centered) -->
        <div class="content">
          <div class="logo-area">SkillSync</div>
          <div class="title">Certificate of Completion</div>
          <div class="subtitle">Internship Program</div>
          <div class="divider"></div>
          <div class="presented-to">This is proudly presented to</div>
          <div class="student-name">${studentName}</div>
          <div class="description">
            For the successful completion of the <strong>${internshipTitle}</strong> internship program
            at <strong>${companyName}</strong>, spanning a duration of <strong>${duration}</strong>
            from <strong>${startStr}</strong> to <strong>${endStr}</strong>.
          </div>
          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">Company</div>
              <div class="detail-value">${companyName}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Duration</div>
              <div class="detail-value">${duration}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Mentor</div>
              <div class="detail-value">${mentorName}</div>
            </div>
          </div>
        </div>

        <!-- Footer (pinned to bottom) -->
        <div class="footer">
          <div class="signature-block">
            <svg class="signature-svg" width="170" height="32" viewBox="0 0 170 32" xmlns="http://www.w3.org/2000/svg">
              <text x="85" y="24" text-anchor="middle" font-family="'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive" font-size="22" fill="#1a365d" font-style="italic" opacity="0.85">${mentorName}</text>
              <path d="M 10 28 Q 45 25 85 28 Q 125 31 160 26" stroke="#1a365d" stroke-width="0.7" fill="none" opacity="0.4"/>
            </svg>
            <div class="signature-line"></div>
            <div class="signature-name">${mentorName}</div>
            <div class="signature-title">Mentor / Supervisor</div>
          </div>
          <div class="seal-container">
            <div class="gold-seal">
              <svg width="65" height="65" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f0d060;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#c9a84c;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#daa520;stop-opacity:1" />
                  </linearGradient>
                </defs>
                <polygon points="45,2 51,20 70,8 60,27 80,25 65,38 82,48 63,48 72,67 55,55 50,75 45,55 35,67 38,48 18,48 35,38 18,25 38,27 28,8 47,20" fill="url(#goldGradient)" stroke="#b8860b" stroke-width="0.5"/>
                <circle cx="45" cy="40" r="22" fill="none" stroke="#8b6914" stroke-width="1.2" opacity="0.7"/>
                <circle cx="45" cy="40" r="18" fill="none" stroke="#8b6914" stroke-width="0.5" opacity="0.5"/>
                <path d="M 33 40 L 41 48 L 57 32" stroke="#1a365d" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                <text x="45" y="68" text-anchor="middle" font-family="Inter, sans-serif" font-size="6" fill="#8b6914" letter-spacing="1" font-weight="600">VERIFIED</text>
              </svg>
            </div>
            <div class="seal-text">Issued: ${issueDate}</div>
          </div>
          <div class="signature-block">
            <svg class="signature-svg" width="170" height="32" viewBox="0 0 170 32" xmlns="http://www.w3.org/2000/svg">
              <text x="85" y="24" text-anchor="middle" font-family="'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive" font-size="22" fill="#1a365d" font-style="italic" opacity="0.85">SkillSync</text>
              <path d="M 15 28 Q 50 25 85 28 Q 120 31 155 26" stroke="#1a365d" stroke-width="0.7" fill="none" opacity="0.4"/>
            </svg>
            <div class="signature-line"></div>
            <div class="signature-name">SkillSync</div>
            <div class="signature-title">Platform Director</div>
          </div>
        </div>

        <div class="cert-id">Certificate ID: ${certId}</div>
      </div>
    </div>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
</body>
</html>`;

    res.json({
      success: true,
      html: certificateHTML,
      fileName: `Certificate-${studentName.replace(/\s+/g, '_')}`
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ success: false, message: 'Server error while generating certificate' });
  }
});

// @desc    Get AI-assisted internship recommendations (Hybrid Engine)
// @route   GET /api/jobseeker/ai-recommendations
// @access  Private (Jobseeker only)
router.get('/ai-recommendations', async (req, res) => {
  try {
    const { extractSkills, matchCandidateToJob } = require('../utils/aiService');
    const user = await User.findById(req.user._id);
    const jobseekerProfile = await JobseekerProfile.findOne({ userId: req.user._id });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Build candidate text for embedding
    let candidateText = '';
    const dbSkills = Array.isArray(user.profile?.skills) ? user.profile.skills : [];
    if (dbSkills.length > 0)          candidateText += `Skills: ${dbSkills.join(', ')}. `;
    if (user.profile?.bio)            candidateText += `Bio: ${user.profile.bio}. `;
    if (jobseekerProfile?.nlp?.parsedText) candidateText += `Experience and Education: ${jobseekerProfile.nlp.parsedText}`;

    if (!candidateText.trim()) {
      return res.status(400).json({ success: false, message: 'Not enough profile data. Please update your profile or resume.' });
    }

    // Step 1: Pre-analyze profile to extract implicit skills using NLP
    const aiExtractedSkills = await extractSkills(candidateText);
    
    // Merge DB skills with extracted skills and remove duplicates
    const allSkillsSet = new Set([...dbSkills, ...aiExtractedSkills].map(s => s.toLowerCase()));
    const mergedCandidateSkills = Array.from(allSkillsSet);

    // Candidate preferences for the Preference component
    const candidatePrefs = {
      location: user.profile?.location || user.location || '',
      domain:   user.profile?.preferredDomain || user.profile?.bio || ''
    };

    const internships = await InternshipPosting.getAvailableInternships({});
    if (!internships || internships.length === 0) return res.json({ success: true, data: [] });

    // Score each internship using the full hybrid engine
    const scoredPromises = internships.map(async (internship) => {
      let jobDescription = internship.title + ' ';
      if (internship.description)    jobDescription += internship.description + ' ';
      if (internship.skillsRequired?.length > 0) {
        jobDescription += `Skills needed: ${internship.skillsRequired.join(', ')}`;
      }
      if (internship.eligibility)    jobDescription += ` Eligibility: ${internship.eligibility}`;

      const jobData = {
        title:    internship.title       || '',
        location: internship.location    || '',
        domain:   internship.domain      || internship.category || '',
      };

      const scores = await matchCandidateToJob(candidateText, jobDescription, {
        candidateSkills: mergedCandidateSkills,
        internshipId:   String(internship._id),
        candidatePrefs,
        jobData,
      });

      return { internship, scores };
    });

    const rawScores = await Promise.all(scoredPromises);
    const rankedInternships = rawScores
      .filter(item => item.scores && Number(item.scores.final_score) > 0)
      .sort((a, b) => Number(b.scores.final_score) - Number(a.scores.final_score));

    res.json({ 
      success: true, 
      analysis: { skills: mergedCandidateSkills },
      data: rankedInternships 
    });

  } catch (error) {
    console.error('AI Recommendations error:', error);
    res.status(500).json({ success: false, message: 'Server error while generating AI recommendations' });
  }
});

// @desc    Record candidate feedback to improve collaborative filtering
// @route   POST /api/jobseeker/ai-feedback
// @access  Private (Jobseeker only)
router.post('/ai-feedback', async (req, res) => {
  try {
    const { internshipId, action } = req.body;
    if (!internshipId || !action) {
      return res.status(400).json({ success: false, message: 'internshipId and action are required.' });
    }

    const user = await User.findById(req.user._id);
    const candidateSkills = Array.isArray(user?.profile?.skills) ? user.profile.skills : [];

    await recordFeedback(candidateSkills, String(internshipId), action);
    res.json({ success: true, message: 'Feedback recorded.' });
  } catch (error) {
    console.error('AI Feedback error:', error);
    res.status(500).json({ success: false, message: 'Error recording feedback.' });
  }
});

module.exports = router;
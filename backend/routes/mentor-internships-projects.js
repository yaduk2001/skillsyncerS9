const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');

const InternshipApplication = require('../models/InternshipApplication');
const MentorTask = require('../models/MentorTask');
const MentorMeeting = require('../models/MentorMeeting');
const MentorResource = require('../models/MentorResource');
const MentorSubmission = require('../models/MentorSubmission');
const MilestoneFeedback = require('../models/MilestoneFeedback');
const User = require('../models/User');
const { sendTaskApprovalEmail, sendTaskRejectionEmail, sendMilestoneFeedbackEmail, sendMeetingScheduledEmail } = require('../utils/emailService');

const mentorAuth = (req, res, next) => {
  if (!req.user?.hasRole?.('mentor')) {
    return res.status(403).json({ success: false, message: 'Access denied. Mentor privileges required.' });
  }
  next();
};

const getMentorDomains = async (mentorId) => {
  // We treat "domain" as the internship title (from InternshipApplication.internshipDetails.title)
  // plus any explicit domain strings used in Mentor* collections.
  const [apps, taskDomains, meetingDomains, resourceDomains, submissionDomains] = await Promise.all([
    InternshipApplication.find({ mentorId, status: { $in: ['selected', 'active', 'completed'] } })
      .select('internshipDetails.title')
      .lean(),
    MentorTask.distinct('domain', { mentorId }),
    MentorMeeting.distinct('domain', { mentorId }),
    MentorResource.distinct('domain', { mentorId }),
    MentorSubmission.distinct('domain', { mentorId }),
  ]);

  const appDomains = apps
    .map((a) => a?.internshipDetails?.title)
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      [...appDomains, ...taskDomains, ...meetingDomains, ...resourceDomains, ...submissionDomains]
        .map((s) => String(s).trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
};

// GET /api/mentor/internships-projects/domains
router.get('/domains', [protect, mentorAuth], async (req, res) => {
  try {
    const domains = await getMentorDomains(req.user._id);
    return res.json({ success: true, data: domains });
  } catch (error) {
    console.error('Mentor IP domains error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load domains', error: error.message });
  }
});

// GET /api/mentor/internships-projects/mentees?domain=...
router.get('/mentees', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const domain = (req.query.domain || '').toString().trim();
    if (!domain) return res.status(400).json({ success: false, message: 'domain is required' });

    const apps = await InternshipApplication.find({
      mentorId,
      status: { $in: ['selected', 'active', 'completed'] },
      'internshipDetails.title': domain,
    })
      .populate('jobseekerId', 'name email')
      .sort({ updatedAt: -1 });

    const data = apps
      .filter((a) => a.jobseekerId)
      .map((a) => ({
        id: a.jobseekerId._id,
        name: a.jobseekerId.name,
        email: a.jobseekerId.email,
        applicationId: a._id,
      }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Mentor IP mentees error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load mentees', error: error.message });
  }
});

// TASKS
// GET /api/mentor/internships-projects/tasks?domain=...
router.get('/tasks', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const domain = (req.query.domain || '').toString().trim();
    const filter = { mentorId, status: 'active' };
    if (domain) filter.domain = domain;

    const tasks = await MentorTask.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Mentor IP tasks error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load tasks', error: error.message });
  }
});

// POST /api/mentor/internships-projects/tasks
router.post('/tasks', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const {
      title,
      description = '',
      domain,
      dueDate = null,
      link = '',
      assignToAllInDomain = true,
      menteeIds = [],
    } = req.body || {};

    if (!title || !domain) {
      return res.status(400).json({ success: false, message: 'title and domain are required' });
    }

    let assignedTo = [];

    if (assignToAllInDomain) {
      const apps = await InternshipApplication.find({
        mentorId,
        status: { $in: ['selected', 'active', 'completed'] },
        'internshipDetails.title': domain,
      }).select('jobseekerId');
      assignedTo = apps.map((a) => a.jobseekerId).filter(Boolean);
    } else if (Array.isArray(menteeIds) && menteeIds.length > 0) {
      assignedTo = menteeIds;
    }

    const task = await MentorTask.create({
      mentorId,
      domain: String(domain).trim(),
      title: String(title).trim(),
      description: String(description || ''),
      dueDate: dueDate ? new Date(dueDate) : null,
      link: String(link || ''),
      assignedTo,
    });

    return res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error('Mentor IP create task error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create task', error: error.message });
  }
});

// MEETINGS
// GET /api/mentor/internships-projects/meetings
router.get('/meetings', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const meetings = await MentorMeeting.find({ mentorId }).sort({ dateTime: 1 }).lean();
    return res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('Mentor IP meetings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load meetings', error: error.message });
  }
});

// POST /api/mentor/internships-projects/meetings
router.post('/meetings', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const { title, domain, dateTime, link, message = '' } = req.body || {};
    if (!title || !domain || !dateTime || !link) {
      return res.status(400).json({ success: false, message: 'title, domain, dateTime, and link are required' });
    }

    const apps = await InternshipApplication.find({
      mentorId,
      status: { $in: ['selected', 'active', 'completed'] },
      'internshipDetails.title': domain,
    }).select('jobseekerId');
    const targetMentees = apps.map((a) => a.jobseekerId).filter(Boolean);

    const meeting = await MentorMeeting.create({
      mentorId,
      domain: String(domain).trim(),
      title: String(title).trim(),
      dateTime: new Date(dateTime),
      link: String(link).trim(),
      message: String(message || ''),
      targetMentees,
    });

    // Send email notifications to all target mentees (async, non-blocking)
    if (targetMentees.length > 0) {
      try {
        const [mentor, mentees] = await Promise.all([
          User.findById(mentorId).select('name').lean(),
          User.find({ _id: { $in: targetMentees } }).select('name email').lean()
        ]);
        const mentorName = mentor?.name || 'Your Mentor';

        // Send emails in parallel — don't await all of them to avoid delaying response
        Promise.allSettled(
          mentees.map(mentee =>
            sendMeetingScheduledEmail(
              mentee.email,
              mentee.name,
              String(title).trim(),
              new Date(dateTime),
              String(link).trim(),
              mentorName,
              String(domain).trim(),
              String(message || '')
            )
          )
        ).then(results => {
          const sent = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
          console.log(`📧 Meeting emails: ${sent}/${mentees.length} sent successfully`);
        });
      } catch (emailErr) {
        console.error('Error sending meeting emails:', emailErr);
      }
    }

    return res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    console.error('Mentor IP create meeting error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create meeting', error: error.message });
  }
});

// RESOURCES
// GET /api/mentor/internships-projects/resources
router.get('/resources', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const resources = await MentorResource.find({ mentorId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: resources });
  } catch (error) {
    console.error('Mentor IP resources error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load resources', error: error.message });
  }
});

// POST /api/mentor/internships-projects/resources
router.post('/resources', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const { title, type = 'url', url = '', domain } = req.body || {};
    if (!title || !domain) {
      return res.status(400).json({ success: false, message: 'title and domain are required' });
    }
    const resource = await MentorResource.create({
      mentorId,
      domain: String(domain).trim(),
      title: String(title).trim(),
      type,
      url: String(url || ''),
    });
    return res.status(201).json({ success: true, data: resource });
  } catch (error) {
    console.error('Mentor IP create resource error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create resource', error: error.message });
  }
});

// SUBMISSIONS
// GET /api/mentor/internships-projects/submissions
router.get('/submissions', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const submissions = await MentorSubmission.find({ mentorId })
      .populate('menteeId', 'name email')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('Mentor IP submissions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load submissions', error: error.message });
  }
});

// PATCH /api/mentor/internships-projects/submissions/:submissionId/view
router.patch('/submissions/:submissionId/view', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const { submissionId } = req.params;
    const submission = await MentorSubmission.findOneAndUpdate(
      { _id: submissionId, mentorId },
      { viewed: true, viewedAt: new Date() },
      { new: true }
    );
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    return res.json({ success: true, data: submission });
  } catch (error) {
    console.error('Mentor IP mark viewed error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark viewed', error: error.message });
  }
});

// POST /api/mentor/internships-projects/submissions/:submissionId/approve
router.post('/submissions/:submissionId/approve', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const { submissionId } = req.params;
    const { mentorFeedback = '' } = req.body;

    // Find submission
    const submission = await MentorSubmission.findOne({ _id: submissionId, mentorId })
      .populate('menteeId', 'name email')
      .populate('mentorId', 'name');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.reviewStatus === 'approved') {
      return res.status(400).json({ success: false, message: 'Submission already approved' });
    }

    // Update submission status
    submission.reviewStatus = 'approved';
    submission.mentorFeedback = mentorFeedback;
    submission.reviewedAt = new Date();
    submission.reviewedBy = mentorId;
    await submission.save();

    // Calculate mentee progress across all tasks in this domain
    const domain = submission.domain;
    const menteeId = submission.menteeId._id;

    // Get all tasks assigned to this mentee in this domain
    const allTasks = await MentorTask.find({
      assignedTo: menteeId,
      domain,
      mentorId,
      status: 'active'
    });

    // Get all approved submissions for these tasks
    const taskIds = allTasks.map(t => t._id);
    const approvedSubmissions = await MentorSubmission.find({
      menteeId,
      taskId: { $in: taskIds },
      reviewStatus: 'approved'
    }).distinct('taskId');

    const totalTasks = allTasks.length;
    const completedTasks = approvedSubmissions.length;
    const pendingTasks = totalTasks - completedTasks;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Check if milestone crossed
    const milestones = [25, 50, 75, 100];
    let milestoneCrossed = null;

    for (const milestone of milestones) {
      if (progress >= milestone) {
        // Check if this milestone feedback already exists
        const existingFeedback = await MilestoneFeedback.findOne({
          menteeId,
          domain,
          milestone,
          mentorId
        });

        if (!existingFeedback) {
          milestoneCrossed = milestone;
        }
      }
    }

    // Send approval email
    try {
      await sendTaskApprovalEmail(
        submission.menteeId.email,
        submission.menteeId.name,
        submission.title,
        submission.mentorId.name,
        mentorFeedback,
        progress
      );
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
    }

    return res.json({
      success: true,
      data: submission,
      progress: {
        percentage: progress,
        totalTasks,
        completedTasks,
        pendingTasks,
        milestoneCrossed
      }
    });
  } catch (error) {
    console.error('Approve submission error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve submission', error: error.message });
  }
});

// POST /api/mentor/internships-projects/submissions/:submissionId/reject
router.post('/submissions/:submissionId/reject', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const { submissionId } = req.params;
    const { mentorFeedback } = req.body;

    // Validate feedback is provided
    if (!mentorFeedback || mentorFeedback.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Feedback is required and must be at least 20 characters'
      });
    }

    // Find submission
    const submission = await MentorSubmission.findOne({ _id: submissionId, mentorId })
      .populate('menteeId', 'name email')
      .populate('mentorId', 'name');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Update submission status
    submission.reviewStatus = 'rejected';
    submission.mentorFeedback = mentorFeedback;
    submission.reviewedAt = new Date();
    submission.reviewedBy = mentorId;
    await submission.save();

    // Send rejection email
    try {
      await sendTaskRejectionEmail(
        submission.menteeId.email,
        submission.menteeId.name,
        submission.title,
        submission.mentorId.name,
        mentorFeedback
      );
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
    }

    return res.json({ success: true, data: submission });
  } catch (error) {
    console.error('Reject submission error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject submission', error: error.message });
  }
});

// GET /api/mentor/internships-projects/mentees/:menteeId/progress
router.get('/mentees/:menteeId/progress', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const { menteeId } = req.params;
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({ success: false, message: 'Domain is required' });
    }

    // Get all tasks assigned to this mentee in this domain
    const allTasks = await MentorTask.find({
      assignedTo: menteeId,
      domain,
      mentorId,
      status: 'active'
    });

    // Get all approved submissions
    const taskIds = allTasks.map(t => t._id);
    const approvedSubmissions = await MentorSubmission.find({
      menteeId,
      taskId: { $in: taskIds },
      reviewStatus: 'approved'
    }).distinct('taskId');

    const totalTasks = allTasks.length;
    const completedTasks = approvedSubmissions.length;
    const pendingTasks = totalTasks - completedTasks;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return res.json({
      success: true,
      data: {
        progress,
        totalTasks,
        completedTasks,
        pendingTasks,
        domain
      }
    });
  } catch (error) {
    console.error('Get mentee progress error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get progress', error: error.message });
  }
});

// GET /api/mentor/internships-projects/submissions/:submissionId/history
router.get('/submissions/:submissionId/history', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const { submissionId } = req.params;

    // Find the submission
    const submission = await MentorSubmission.findOne({ _id: submissionId, mentorId });
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Get all submissions for the same task and mentee
    const allSubmissions = await MentorSubmission.find({
      mentorId,
      menteeId: submission.menteeId,
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

    return res.json({ success: true, data: historyData });
  } catch (error) {
    console.error('Get submission history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get history', error: error.message });
  }
});

// POST /api/mentor/internships-projects/milestones/feedback
router.post('/milestones/feedback', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const { menteeId, domain, milestone, feedback, rating } = req.body;

    // Validate inputs
    if (!menteeId || !domain || !milestone || !feedback) {
      return res.status(400).json({
        success: false,
        message: 'menteeId, domain, milestone, and feedback are required'
      });
    }

    if (![25, 50, 75, 100].includes(milestone)) {
      return res.status(400).json({
        success: false,
        message: 'Milestone must be 25, 50, 75, or 100'
      });
    }

    if (feedback.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Feedback must be at least 50 characters'
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if feedback already exists
    const existing = await MilestoneFeedback.findOne({ menteeId, domain, milestone, mentorId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Feedback for this milestone already exists'
      });
    }

    // Calculate current progress and tasks summary
    const allTasks = await MentorTask.find({
      assignedTo: menteeId,
      domain,
      mentorId,
      status: 'active'
    });

    const taskIds = allTasks.map(t => t._id);
    const approvedSubmissions = await MentorSubmission.find({
      menteeId,
      taskId: { $in: taskIds },
      reviewStatus: 'approved'
    }).distinct('taskId');

    const totalTasks = allTasks.length;
    const completedTasks = approvedSubmissions.length;
    const pendingTasks = totalTasks - completedTasks;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Create milestone feedback
    const milestoneFeedback = await MilestoneFeedback.create({
      mentorId,
      menteeId,
      domain,
      milestone,
      feedback: feedback.trim(),
      rating: rating || null,
      progressSnapshot: progress,
      tasksSummary: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks
      }
    });

    // Get mentee and mentor info for email
    const mentee = await User.findById(menteeId).select('name email');
    const mentor = await User.findById(mentorId).select('name');

    // Send milestone feedback email
    if (mentee && mentor) {
      try {
        await sendMilestoneFeedbackEmail(
          mentee.email,
          mentee.name,
          milestone,
          feedback,
          rating,
          mentor.name
        );
      } catch (emailError) {
        console.error('Error sending milestone feedback email:', emailError);
      }
    }

    return res.status(201).json({ success: true, data: milestoneFeedback });
  } catch (error) {
    console.error('Create milestone feedback error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create feedback', error: error.message });
  }
});

// GET /api/mentor/internships-projects/milestones
router.get('/milestones', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const { menteeId, domain } = req.query;

    const query = { mentorId };
    if (menteeId) query.menteeId = menteeId;
    if (domain) query.domain = domain;

    const feedbacks = await MilestoneFeedback.find(query)
      .populate('menteeId', 'name email')
      .sort({ milestone: 1, createdAt: -1 });

    return res.json({ success: true, data: feedbacks });
  } catch (error) {
    console.error('Get milestone feedbacks error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get feedbacks', error: error.message });
  }
});

module.exports = router;


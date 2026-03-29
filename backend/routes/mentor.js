const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MentorRequest = require('../models/MentorRequest');
const InternshipApplication = require('../models/InternshipApplication');
const MentorTask = require('../models/MentorTask');
const MentorMeeting = require('../models/MentorMeeting');
const MentorResource = require('../models/MentorResource');
const MentorSubmission = require('../models/MentorSubmission');
const MilestoneFeedback = require('../models/MilestoneFeedback');
const InternshipPosting = require('../models/InternshipPosting');
const ProjectIdea = require('../models/ProjectIdea');
const { protect } = require('../middleware/auth');
const { sendMentorCredentials, sendNotificationEmail, sendRequestRejectionEmail, sendMilestoneFeedbackEmail } = require('../utils/emailService');
const {
  getMentorAssignment,
  getMentorMentees,
  removeMentorAssignment,
  assignMentor,
  findBestMentor,
  processSelectedJobseekers,
  processAssignmentQueue
} = require('../utils/mentorAssignment');

// Helper function to calculate progress percentage
const computeProgress = (startDate, endDate, status) => {
  if (status === 'completed') return 100;
  if (status === 'incomplete') return 0;
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const pct = Math.round(((now - start) / (end - start)) * 100);
  return Math.max(0, Math.min(100, pct));
};

// Function to determine status based on progress, dates, and task completion
// taskCount: number of tasks assigned to the mentee
// submissionCount: number of submissions made by the mentee
const determineStatus = (startDate, endDate, status, taskCount = null, submissionCount = null) => {
  // If explicitly marked as completed, show Completed
  if (status === 'completed') return 'completed';

  // If explicitly marked as incomplete, show Incomplete
  if (status === 'incomplete') return 'incomplete';

  // If no dates available, show Active
  if (!startDate || !endDate) return 'active';

  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // If internship hasn't started yet
  if (now < start) return 'active';

  // If internship has ended
  if (now > end) {
    // If task data is available, check for incomplete status
    if (taskCount !== null && submissionCount !== null) {
      // No tasks were assigned OR no submissions were made → incomplete
      if (taskCount === 0 || submissionCount === 0) {
        return 'incomplete';
      }
    }
    return 'completed';
  }

  // If currently within internship period
  return 'active';
};

// Helper function to calculate end date from start date and duration
const calculateEndDate = (startDate, duration) => {
  if (!startDate || !duration) return null;

  const start = new Date(startDate);
  const end = new Date(start);

  // Parse duration string
  const durationMatch = duration.match(/(\d+)\s*(day|month|year|s)/i);
  if (!durationMatch) return null;

  const value = parseInt(durationMatch[1]);
  const unit = durationMatch[2].toLowerCase();

  switch (unit) {
    case 'day':
    case 'days':
      end.setDate(start.getDate() + value);
      break;
    case 'month':
    case 'months':
      end.setMonth(start.getMonth() + value);
      break;
    case 'year':
    case 'years':
      end.setFullYear(start.getFullYear() + value);
      break;
    default:
      return null;
  }

  return end;
};

const mentorAuth = async (req, res, next) => {
  try {
    if (!req.user?.hasRole?.('mentor')) {
      return res.status(403).json({ success: false, message: 'Access denied. Mentor privileges required.' });
    }
    next();
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

// Middleware to check if user is admin
const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Middleware to check if user is company/employer
const companyAuth = async (req, res, next) => {
  try {
    if (!['company', 'employer'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Company privileges required.'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ==================== COMPANY ROUTES ====================

// Submit mentor request (Company)
router.post('/request', [protect, companyAuth], async (req, res) => {
  try {
    const {
      employeeName,
      employeeEmail,
      employeePhone,
      employeePosition,
      employeeDepartment,
      justification,
      expertise,
      yearsOfExperience
    } = req.body;

    // Validation
    if (!employeeName || !employeeEmail || !employeePhone || !employeePosition ||
      !employeeDepartment || !justification || !yearsOfExperience) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if employee already exists as a user
    const existingUser = await User.findOne({ email: employeeEmail });
    if (existingUser) {
      // If employee already exists, check if they're already a mentor
      if (existingUser.hasRole('mentor')) {
        return res.status(400).json({
          success: false,
          message: 'This employee is already assigned as a mentor'
        });
      }
      // If they're not a mentor, we can proceed with the request
    }

    // Check if there's already a pending request for this employee
    const existingRequest = await MentorRequest.findOne({
      employeeEmail,
      status: 'pending'
    });
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'A pending mentor request already exists for this employee'
      });
    }

    // Normalize email to lowercase (schema does this, but do it explicitly)
    const normalizedEmail = employeeEmail.toLowerCase().trim();

    // Validate yearsOfExperience enum
    const validExperienceLevels = ['0-1', '1-3', '3-5', '5-10', '10+'];
    if (!validExperienceLevels.includes(yearsOfExperience)) {
      return res.status(400).json({
        success: false,
        message: `Invalid years of experience. Must be one of: ${validExperienceLevels.join(', ')}`
      });
    }

    // Create mentor request
    let mentorRequest;
    try {
      mentorRequest = await MentorRequest.create({
        companyId: req.user._id,
        requestedBy: req.user._id,
        employeeName: employeeName.trim(),
        employeeEmail: normalizedEmail,
        employeePhone: employeePhone.trim(),
        employeePosition: employeePosition.trim(),
        employeeDepartment: employeeDepartment.trim(),
        justification: justification.trim(),
        expertise: Array.isArray(expertise) ? expertise : (expertise ? [expertise] : []),
        yearsOfExperience: yearsOfExperience.trim()
      });
    } catch (createError) {
      console.error('Error during MentorRequest.create:', createError);
      throw createError;
    }

    // Populate the request for response
    try {
      await mentorRequest.populate([
        { path: 'companyId', select: 'name email company.name company' },
        { path: 'requestedBy', select: 'name email' }
      ]);
    } catch (populateError) {
      console.error('Error during populate:', populateError);
      // Don't fail the request if populate fails, just log it
    }

    // Send notification email to admin (optional)
    try {
      // You can implement admin notification here if needed
      console.log('Mentor request created:', mentorRequest._id);
    } catch (emailError) {
      console.error('Error sending admin notification:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Mentor request submitted successfully',
      data: mentorRequest
    });
  } catch (error) {
    console.error('Error creating mentor request:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('User:', req.user?._id);

    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed. Please check your input.',
        errors: validationErrors,
        error: error.message
      });
    }

    // Handle duplicate key errors (e.g., duplicate email)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A mentor request with this email already exists',
        error: error.message
      });
    }

    // Handle CastError (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Please check your input.',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating mentor request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Get company's mentor requests
router.get('/requests', [protect, companyAuth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { companyId: req.user._id };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const requests = await MentorRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Enrich with current mentor grade if employee exists as mentor user
    const enriched = await Promise.all(requests.map(async (reqDoc) => {
      try {
        const user = await User.findOne({ email: reqDoc.employeeEmail }).select('mentorProfile.grade role secondaryRoles');
        const isMentor = !!user && (user.role === 'mentor' || (Array.isArray(user.secondaryRoles) && user.secondaryRoles.includes('mentor')));
        const grade = isMentor ? (user.mentorProfile?.grade || null) : null;
        const data = reqDoc.toObject();
        data.employeeMentorGrade = grade;
        return data;
      } catch (_) {
        const data = reqDoc.toObject();
        data.employeeMentorGrade = null;
        return data;
      }
    }));

    const totalRequests = await MentorRequest.countDocuments(filter);

    res.json({
      success: true,
      data: {
        requests: enriched,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRequests / limit),
          totalRequests,
          hasNext: page * limit < totalRequests,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching mentor requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching mentor requests',
      error: error.message
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all mentor requests (Admin)
router.get('/admin/requests', [protect, adminAuth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const requests = await MentorRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Enrich for admin list too
    const enrichedAdmin = await Promise.all(requests.map(async (reqDoc) => {
      try {
        const user = await User.findOne({ email: reqDoc.employeeEmail }).select('mentorProfile.grade role secondaryRoles');
        const isMentor = !!user && (user.role === 'mentor' || (Array.isArray(user.secondaryRoles) && user.secondaryRoles.includes('mentor')));
        const grade = isMentor ? (user.mentorProfile?.grade || null) : null;
        const data = reqDoc.toObject();
        data.employeeMentorGrade = grade;
        return data;
      } catch (_) {
        const data = reqDoc.toObject();
        data.employeeMentorGrade = null;
        return data;
      }
    }));

    const totalRequests = await MentorRequest.countDocuments(filter);

    res.json({
      success: true,
      data: {
        requests: enrichedAdmin,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRequests / limit),
          totalRequests,
          hasNext: page * limit < totalRequests,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching mentor requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching mentor requests',
      error: error.message
    });
  }
});

// Approve mentor request and create mentor account (Admin)
router.patch('/admin/requests/:requestId/approve', [protect, adminAuth], async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNotes } = req.body;

    const request = await MentorRequest.findById(requestId)
      .populate('companyId', 'name email company.name company');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Mentor request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request has already been processed'
      });
    }

    // Check if employee already exists as a user
    const existingUser = await User.findOne({ email: request.employeeEmail });
    let mentor;

    if (existingUser) {
      // If employee already exists, check if they're already a mentor
      if (existingUser.hasRole('mentor')) {
        return res.status(400).json({
          success: false,
          message: 'This employee is already assigned as a mentor'
        });
      }

      // Check if this is an existing mentor who should be converted to employee + mentor
      // This handles cases where the user was assigned as mentor before dual-role system
      if (existingUser.role === 'mentor' && request.employeeEmail) {
        // Convert existing mentor to employee with mentor secondary role
        existingUser.role = 'employee';
        if (!existingUser.secondaryRoles) {
          existingUser.secondaryRoles = [];
        }
        if (!existingUser.secondaryRoles.includes('mentor')) {
          existingUser.secondaryRoles.push('mentor');
        }
      } else if (existingUser.role === 'employee') {
        // Keep employee as primary role, add mentor as secondary role
        if (!existingUser.secondaryRoles) {
          existingUser.secondaryRoles = [];
        }
        if (!existingUser.secondaryRoles.includes('mentor')) {
          existingUser.secondaryRoles.push('mentor');
        }
      } else {
        // For non-employees, make mentor the primary role
        existingUser.role = 'mentor';
      }

      // Safely get company name
      const companyName = (request.companyId?.company?.name) ||
        (request.companyId?.name) ||
        'Company';

      // Determine grade based on experience
      // 0-3 years -> B, >3 years -> A
      let initialGrade = 'B';
      const exp = request.yearsOfExperience;
      if (['3-5', '5-10', '10+'].includes(exp)) {
        initialGrade = 'A';
      }

      existingUser.mentorProfile = {
        bio: `Mentor at ${companyName}`,
        expertise: request.expertise || [],
        yearsOfExperience: request.yearsOfExperience,
        grade: initialGrade,
        phone: request.employeePhone,
        linkedin: ''
      };

      // Ensure the mentor is linked to their company
      if (!existingUser.employeeProfile) {
        existingUser.employeeProfile = {};
      }
      existingUser.employeeProfile.companyId = request.companyId._id || request.companyId;
      existingUser.employeeProfile.department = request.employeeDepartment || existingUser.employeeProfile.department;
      existingUser.employeeProfile.position = request.employeePosition || existingUser.employeeProfile.position;

      await existingUser.save();
      mentor = existingUser;

      // Send notification email to existing employee about mentor assignment
      try {
        await sendNotificationEmail(
          request.employeeEmail,
          'You have been assigned as a Mentor - SkillSyncer',
          `
            <h2>Mentor Assignment Notification</h2>
            <p>Dear ${request.employeeName},</p>
            <p>Congratulations! You have been assigned as a mentor on SkillSyncer.</p>
            <p><strong>Company:</strong> ${(request.companyId?.company?.name) || (request.companyId?.name) || 'Company'}</p>
            <p><strong>Your Role:</strong> Mentor</p>
            <p><strong>Expertise Areas:</strong> ${request.expertise && request.expertise.length > 0 ? request.expertise.join(', ') : 'Not specified'}</p>
            <p>You can now access both the employee dashboard and mentor dashboard using your existing login credentials.</p>
            <p>After logging in, you can switch between dashboards using the role switcher.</p>
            <p>Login here: <a href="${process.env.FRONTEND_URL}/auth">${process.env.FRONTEND_URL}/auth</a></p>
            <p>Thank you for contributing to the SkillSyncer community!</p>
            <br>
            <p>Best regards,<br>SkillSyncer Team</p>
          `
        );
      } catch (emailError) {
        console.error('Error sending mentor assignment notification:', emailError);
      }
    } else {
      // Create new mentor user (existing logic)
      const generatePassword = (name, phone) => {
        const namePrefix = name.replace(/\s+/g, '').substring(0, 4).toLowerCase();
        const phoneDigits = phone.replace(/\D/g, '');
        const phoneSuffix = phoneDigits.slice(-2);
        return namePrefix + phoneSuffix;
      };

      const autoGeneratedPassword = generatePassword(request.employeeName, request.employeePhone);
      const plainPassword = autoGeneratedPassword;

      // Safely get company name
      const companyName = (request.companyId?.company?.name) ||
        (request.companyId?.name) ||
        'Company';

      // Create mentor user
      mentor = await User.create({
        name: request.employeeName,
        email: request.employeeEmail,
        password: autoGeneratedPassword,
        role: 'mentor',
        isActive: true,
        isEmailVerified: true,
        // Link mentor to their company via employeeProfile
        employeeProfile: {
          companyId: request.companyId._id || request.companyId,
          department: request.employeeDepartment,
          position: request.employeePosition
        },
        mentorProfile: {
          bio: `Mentor at ${companyName}`,
          expertise: request.expertise || [],
          yearsOfExperience: request.yearsOfExperience,
          grade: ['3-5', '5-10', '10+'].includes(request.yearsOfExperience) ? 'A' : 'B',
          phone: request.employeePhone,
          linkedin: ''
        }
      });

      // Send credentials email to new mentor
      try {
        const emailResult = await sendMentorCredentials(
          request.employeeEmail,
          request.employeeName,
          plainPassword
        );

        if (emailResult.success) {
          console.log('Mentor credentials email sent successfully');
        } else {
          console.error('Failed to send mentor credentials email');
        }
      } catch (emailError) {
        console.error('Error sending mentor credentials email:', emailError);
      }
    }

    // Update request status
    request.status = 'approved';
    request.adminNotes = adminNotes || '';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Send notification to company
    try {
      const isExistingEmployee = existingUser ? 'existing employee' : 'new mentor';
      const notificationMessage = existingUser
        ? 'Your existing employee has been successfully assigned as a mentor and can now access both the employee dashboard and mentor dashboard with their existing credentials.'
        : 'A new mentor account has been created and the mentor has been notified with their login credentials.';

      const companyEmail = request.companyId?.email || request.companyId?.email || '';
      const companyName = (request.companyId?.company?.name) || (request.companyId?.name) || 'Company';

      if (companyEmail) {
        await sendNotificationEmail(
          companyEmail,
          'Mentor Request Approved - SkillSyncer',
          `
            <h2>Mentor Request Approved</h2>
            <p>Dear ${companyName},</p>
          <p>Your mentor request for <strong>${request.employeeName}</strong> has been approved!</p>
          <p><strong>Employee Details:</strong></p>
          <ul>
            <li>Name: ${request.employeeName}</li>
            <li>Email: ${request.employeeEmail}</li>
            <li>Position: ${request.employeePosition}</li>
            <li>Department: ${request.employeeDepartment}</li>
            <li>Type: ${isExistingEmployee}</li>
          </ul>
          <p>${notificationMessage}</p>
          ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
          <br>
          <p>Best regards,<br>SkillSyncer Team</p>
        `
        );
      }
    } catch (emailError) {
      console.error('Error sending company notification:', emailError);
    }

    const mentorResponse = await User.findById(mentor._id).select('-password');

    res.json({
      success: true,
      message: 'Mentor request approved and mentor account created successfully',
      data: {
        request,
        mentor: mentorResponse
      }
    });
  } catch (error) {
    console.error('Error approving mentor request:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving mentor request',
      error: error.message
    });
  }
});

// Reject mentor request (Admin)
router.patch('/admin/requests/:requestId/reject', [protect, adminAuth], async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNotes } = req.body;

    const request = await MentorRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Mentor request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request has already been processed'
      });
    }

    // Update request status
    request.status = 'rejected';
    request.adminNotes = adminNotes || '';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Send notification to company
    try {
      await sendRequestRejectionEmail(
        request.companyId.email,
        request.companyId.name,
        'Mentor',
        'SkillSyncer', // Since the request is TO SkillSyncer FROM Company, the context is slightly different, but the text works. 
        // Actually, the email function signature is (toEmail, toName, type, companyName, reason). 
        // Here, the "companyName" in the email body refers to the company applying? No, usually refers to the entity rejecting. 
        // Let's pass 'SkillSyncer' or leave it as the 'Company' name if it was an internal rejection?
        // The original email said "Dear CompanyName, your request for EmployeeName...". 
        // The new function says "Dear ToName, your TYPE application for COMPANYNAME was not approved".
        // Use carefully: toEmail=CompanyEmail, toName=CompanyName, Type='Mentor Request', CompanyName='SkillSyncer' (Admin is rejecting).
        adminNotes
      );
    } catch (emailError) {
      console.error('Error sending rejection notification:', emailError);
    }

    res.json({
      success: true,
      message: 'Mentor request rejected successfully',
      data: request
    });
  } catch (error) {
    console.error('Error rejecting mentor request:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting mentor request',
      error: error.message
    });
  }
});

// Get all mentors (Admin)
router.get('/admin/mentors', [protect, adminAuth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }] };
    if (status) filter.isActive = status === 'active';

    const skip = (page - 1) * limit;

    const mentors = await User.find(filter)
      .select('-password')
      .populate('employeeProfile.companyId', 'name company.name company.logo company.description company.industry company.location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalMentors = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        mentors,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMentors / limit),
          totalMentors,
          hasNext: page * limit < totalMentors,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching mentors',
      error: error.message
    });
  }
});

// ==================== MENTOR ROUTES ====================

// Mentor overview (KPIs for mentor dashboard)
// GET /api/mentor/overview
router.get('/overview', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;

    const apps = await InternshipApplication.find({
      mentorId,
      status: { $in: ['selected', 'active', 'completed', 'incomplete'] },
    }).select('status jobseekerId');

    const totalMentees = new Set(apps.map((a) => a.jobseekerId?.toString?.() || '')).size;
    const activeInternships = apps.filter((a) => a.status === 'active' || a.status === 'selected').length;

    // Calculate active projects (currently using mentor tasks as proxy for projects)
    const activeProjects = await MentorTask.countDocuments({
      mentorId,
      status: 'active',
      dueDate: { $gte: new Date() } // Active tasks that are not overdue
    });

    const pendingSubmissions = await MentorSubmission.countDocuments({ mentorId, viewed: false });
    const upcomingMeetings = await MentorMeeting.countDocuments({
      mentorId,
      status: 'scheduled',
      dateTime: { $gt: new Date() },
    });

    // Calculate completion rate based on completed vs total applications
    const completedApps = apps.filter((a) => a.status === 'completed').length;
    const completionRate = totalMentees > 0 ? Math.round((completedApps / totalMentees) * 100) : 0;

    return res.json({
      success: true,
      data: {
        totalMentees,
        activeInternships,
        activeProjects,
        pendingSubmissions,
        upcomingMeetings,
        completionRate,
      },
    });
  } catch (error) {
    console.error('Error fetching mentor overview:', error);
    return res.status(500).json({ success: false, message: 'Error fetching mentor overview', error: error.message });
  }
});

// Get completed internships for feedback
// GET /api/mentor/completed-internships
router.get('/completed-internships', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;

    // Find all applications for this mentor
    // Include 'selected' status because applications transition to selected after onboarding
    // and may not always move to 'active' before the internship period ends.
    const applications = await InternshipApplication.find({
      mentorId,
      status: { $in: ['selected', 'active', 'completed'] }
    })
      .populate('jobseekerId', 'name email profile.profilePicture')
      .populate('internshipId', 'title companyName startDate duration');

    const finishedInternships = [];

    for (const app of applications) {
      // Skip if vital data is missing
      if (!app.internshipId || !app.jobseekerId) continue;

      const startDate = app.internshipDetails?.startDate || app.internshipId.startDate;
      const duration = app.internshipDetails?.duration || app.internshipId.duration;
      const endDate = calculateEndDate(startDate, duration);

      // Calculate task progress
      const totalTasks = await MentorTask.countDocuments({
        mentorId,
        assignedTo: app.jobseekerId._id
      });

      let progress = 0;
      let submittedTasks = 0;

      if (totalTasks > 0) {
        // Get all tasks assigned to this user by this mentor
        const tasks = await MentorTask.find({
          mentorId,
          assignedTo: app.jobseekerId._id
        }).select('_id');

        const taskIds = tasks.map(t => t._id);

        // Count submissions that are NOT rejected (approved + pending + undefined all count)
        submittedTasks = await MentorSubmission.countDocuments({
          mentorId,
          menteeId: app.jobseekerId._id,
          taskId: { $in: taskIds },
          reviewStatus: { $ne: 'rejected' }
        });

        progress = Math.min(100, Math.round((submittedTasks / totalTasks) * 100));
      } else {
        // If no tasks assigned, progress is 0 unless manually completed? 
        // Let's assume progress is 0.
        progress = 0;
      }

      // Check completion criteria:
      // 1. Internship end date has passed OR status is explicitly 'completed'
      // 2. Progress is >= 90%

      const isTimeCompleted = endDate && new Date() > endDate;
      const isStatusCompleted = app.status === 'completed';
      const isProgressSufficient = progress >= 90;

      if ((isTimeCompleted || isStatusCompleted) && isProgressSufficient) {
        finishedInternships.push({
          applicationId: app._id,
          internshipTitle: app.internshipDetails?.title || app.internshipId.title,
          jobseekerName: app.jobseekerId.name,
          jobseekerId: app.jobseekerId._id,
          startDate: startDate,
          endDate: endDate,
          duration: duration,
          progress: progress,
          tasksAssigned: totalTasks,
          tasksSubmitted: submittedTasks,
          status: app.status
        });
      }
    }

    // Enrich with existing feedback data so frontend can split Current / History
    if (finishedInternships.length > 0) {
      const menteeIds = finishedInternships.map(fi => fi.jobseekerId);
      const feedbacks = await MilestoneFeedback.find({
        mentorId,
        menteeId: { $in: menteeIds }
      }).lean();

      const feedbackMap = {};
      feedbacks.forEach(fb => {
        const key = fb.menteeId.toString();
        // Use latest feedback if multiple exist
        if (!feedbackMap[key] || new Date(fb.createdAt) > new Date(feedbackMap[key].createdAt)) {
          feedbackMap[key] = fb;
        }
      });

      finishedInternships.forEach(fi => {
        const fb = feedbackMap[fi.jobseekerId.toString()];
        fi.feedbackData = fb ? {
          _id: fb._id,
          rating: fb.rating,
          feedback: fb.feedback,
          domain: fb.domain,
          milestone: fb.milestone,
          progressSnapshot: fb.progressSnapshot,
          tasksSummary: fb.tasksSummary,
          createdAt: fb.createdAt,
          updatedAt: fb.updatedAt
        } : null;
      });
    }

    res.json({
      success: true,
      data: finishedInternships
    });

  } catch (error) {
    console.error('Error fetching completed internships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching completed internships',
      error: error.message
    });
  }
});

// Detailed mentees list (for mentor dashboard)
// GET /api/mentor/mentees-detailed
router.get('/mentees-detailed', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;

    const apps = await InternshipApplication.find({
      mentorId,
      status: { $in: ['selected', 'active', 'completed', 'incomplete'] },
    })
      .populate('jobseekerId', 'name email')
      .populate('internshipId', 'title startDate duration')
      .sort({ updatedAt: -1 });

    const appIds = apps.map((a) => a._id);
    const menteeIds = apps.map((a) => a.jobseekerId?._id).filter(Boolean);

    // Get latest submissions per mentee
    const latestSubmissions = await MentorSubmission.aggregate([
      {
        $match: {
          mentorId: mentorId,
          menteeId: { $in: menteeIds },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$menteeId',
          lastSubmissionDate: { $first: '$createdAt' },
          submissionCount: { $sum: 1 },
        },
      },
    ]);

    const lastSubByMentee = new Map(
      latestSubmissions.map((s) => [s._id?.toString?.() || String(s._id), s.lastSubmissionDate])
    );
    const submissionCountByMentee = new Map(
      latestSubmissions.map((s) => [s._id?.toString?.() || String(s._id), s.submissionCount])
    );

    // Get task counts per mentee
    const taskCounts = await MentorTask.aggregate([
      {
        $match: {
          mentorId: mentorId,
          assignedTo: { $in: menteeIds },
        },
      },
      { $unwind: '$assignedTo' },
      {
        $match: {
          assignedTo: { $in: menteeIds },
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          taskCount: { $sum: 1 },
        },
      },
    ]);

    const taskCountByMentee = new Map(
      taskCounts.map((t) => [t._id?.toString?.() || String(t._id), t.taskCount])
    );

    const data = [];
    for (const app of apps) {
      const mentee = app.jobseekerId;
      const title = app.internshipDetails?.title || app.internshipId?.title || 'Project';
      const startDate = app.internshipDetails?.startDate || app.internshipId?.startDate || app.createdAt || null;

      // Calculate end date from internship data
      let endDate = null;
      if (app.internshipId?.startDate && app.internshipId?.duration) {
        endDate = calculateEndDate(app.internshipId.startDate, app.internshipId.duration);
      }

      const menteeKey = mentee?._id?.toString?.() || '';

      // Determine context type based on application details
      const contextType = app.internshipDetails || app.internshipId ? 'internship' : 'project';

      // Get task and submission counts for this mentee
      const taskCount = taskCountByMentee.get(menteeKey) || 0;
      const submissionCount = submissionCountByMentee.get(menteeKey) || 0;

      // Determine status with task/submission awareness
      const computedStatus = determineStatus(startDate, endDate, app.status, taskCount, submissionCount);

      // If status changed to 'incomplete', persist it back to the application
      // so the jobseeker also sees it in their Application Status section
      if (computedStatus === 'incomplete' && app.status !== 'incomplete') {
        try {
          app.status = 'incomplete';
          await app.save();
          console.log(`Application ${app._id} status updated to 'incomplete' (no tasks/submissions after end date)`);
        } catch (saveErr) {
          console.error(`Failed to update application ${app._id} status:`, saveErr.message);
        }
      }

      data.push({
        jobseekerId: mentee?._id,
        name: mentee?.name || 'Unknown',
        email: mentee?.email || '',
        contextType,
        contextId: app._id,
        contextName: title,
        progressPercentage: computeProgress(startDate, endDate, computedStatus),
        status: computedStatus,
        taskCount,
        submissionCount,
        startDate,
        endDate,
        assignedDate: app.updatedAt || app.createdAt,
        lastSubmissionDate: lastSubByMentee.get(menteeKey) || null,
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching detailed mentees:', error);
    return res.status(500).json({ success: false, message: 'Error fetching detailed mentees', error: error.message });
  }
});

// Get mentor profile
router.get('/profile', [protect], async (req, res) => {
  try {
    if (req.user.role !== 'mentor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Mentor privileges required.'
      });
    }

    const mentor = await User.findById(req.user._id).select('-password');

    res.json({
      success: true,
      data: mentor
    });
  } catch (error) {
    console.error('Error fetching mentor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching mentor profile',
      error: error.message
    });
  }
});

// Update mentor profile
router.patch('/profile', [protect], async (req, res) => {
  try {
    if (req.user.role !== 'mentor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Mentor privileges required.'
      });
    }

    const { mentorProfile } = req.body;

    const mentor = await User.findByIdAndUpdate(
      req.user._id,
      { mentorProfile },
      { new: true }
    ).select('-password');

    // Recalculate profile completion
    await mentor.calculateProfileCompletion();
    await mentor.save();

    res.json({
      success: true,
      message: 'Mentor profile updated successfully',
      data: mentor
    });
  } catch (error) {
    console.error('Error updating mentor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating mentor profile',
      error: error.message
    });
  }
});

// Migration endpoint to convert existing mentors to dual-role system
router.post('/migrate-to-dual-role', [protect], async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user is currently a mentor, convert to employee + mentor
    if (user.role === 'mentor') {
      user.role = 'employee';
      if (!user.secondaryRoles) {
        user.secondaryRoles = [];
      }
      if (!user.secondaryRoles.includes('mentor')) {
        user.secondaryRoles.push('mentor');
      }

      await user.save();

      res.json({
        success: true,
        message: 'Successfully migrated to dual-role system',
        data: {
          primaryRole: user.role,
          secondaryRoles: user.secondaryRoles,
          allRoles: user.getAllRoles()
        }
      });
    } else {
      res.json({
        success: true,
        message: 'User is not a mentor, no migration needed',
        data: {
          primaryRole: user.role,
          secondaryRoles: user.secondaryRoles || [],
          allRoles: user.getAllRoles()
        }
      });
    }
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during migration',
      error: error.message
    });
  }
});

// ==================== MENTOR ASSIGNMENT ROUTES ====================

// Get mentor assignment for a job seeker
// GET /api/mentor/assignment/:jobseekerId
router.get('/assignment/:jobseekerId', [protect], async (req, res) => {
  try {
    const { jobseekerId } = req.params;

    // Check if user is admin, mentor, or the job seeker themselves
    if (req.user.role !== 'admin' &&
      !req.user.hasRole('mentor') &&
      req.user._id.toString() !== jobseekerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const result = await getMentorAssignment(jobseekerId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result.jobseeker
    });
  } catch (error) {
    console.error('Error fetching mentor assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching mentor assignment',
      error: error.message
    });
  }
});

// Get all mentees for a mentor
// GET /api/mentor/mentees
router.get('/mentees', [protect], async (req, res) => {
  try {
    // Check if user is a mentor
    if (!req.user.hasRole('mentor')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Mentor privileges required.'
      });
    }

    const MentorTask = require('../models/MentorTask');
    const MentorSubmission = require('../models/MentorSubmission');

    // Get applications for the mentor to return in a format compatible with the frontend
    const apps = await InternshipApplication.find({
      mentorId: req.user._id,
      status: { $in: ['selected', 'active', 'completed', 'incomplete'] },
    })
      .populate('jobseekerId', 'name email')
      .sort({ updatedAt: -1 });

    // Calculate progress for each mentee
    const mentees = await Promise.all(apps.map(async (app) => {
      const mentee = app.jobseekerId;

      // Get domain for this mentee (internship title)
      const domain = app.internshipDetails?.title || 'Other';

      // Get all tasks for this mentor in this domain
      const allDomainTasks = await MentorTask.find({
        mentorId: req.user._id,
        domain: domain,
        status: 'active'
      });

      // Get tasks assigned to this specific mentee
      // Handle both array of ObjectIds and array of strings
      const assignedTasks = allDomainTasks.filter(task => {
        if (!task.assignedTo || !mentee?._id) return false;

        const menteeIdStr = mentee._id.toString();
        return task.assignedTo.some(assignedId =>
          assignedId.toString() === menteeIdStr
        );
      });

      // Get submissions from this mentee in this domain
      const submissions = await MentorSubmission.find({
        mentorId: req.user._id,
        menteeId: mentee?._id,
        domain: domain
      });

      // Calculate progress percentage
      let progressPercentage = 0;
      if (assignedTasks.length > 0) {
        // Progress = (number of submissions / number of assigned tasks) * 100
        // But cap at 95% if not completed, 100% if completed
        const submissionRatio = submissions.length / assignedTasks.length;
        progressPercentage = Math.min(95, Math.round(submissionRatio * 100));
      }

      // If internship is completed, set progress to 100%
      if (app.status === 'completed') {
        progressPercentage = 100;
      }

      return {
        id: mentee?._id,
        jobseekerId: mentee?._id,
        name: mentee?.name || 'Unknown',
        email: mentee?.email || '',
        status: determineStatus(null, null, app.status),
        progressPercentage: progressPercentage,
        contextName: app.internshipDetails?.title || 'Other',
        contextType: app.internshipDetails ? 'internship' : null,
        contextId: app._id,
        assignedDate: app.updatedAt || app.createdAt,
        internshipTitle: app.internshipDetails?.title,
        applicationId: app._id,
        taskCount: assignedTasks.length,
        submissionCount: submissions.length
      };
    }));

    res.json({
      success: true,
      data: mentees
    });
  } catch (error) {
    console.error('Error fetching mentees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching mentees',
      error: error.message
    });
  }
});

// Manually assign a mentor to a job seeker (Admin only)
// POST /api/mentor/assign
router.post('/assign', [protect, adminAuth], async (req, res) => {
  try {
    const { jobseekerId, mentorId } = req.body;

    if (!jobseekerId || !mentorId) {
      return res.status(400).json({
        success: false,
        message: 'jobseekerId and mentorId are required'
      });
    }

    const result = await assignMentor(jobseekerId, mentorId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Mentor assigned successfully',
      data: result
    });
  } catch (error) {
    console.error('Error assigning mentor:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning mentor',
      error: error.message
    });
  }
});

// Remove mentor assignment (Admin only)
// DELETE /api/mentor/assignment/:jobseekerId
router.delete('/assignment/:jobseekerId', [protect, adminAuth], async (req, res) => {
  try {
    const { jobseekerId } = req.params;

    const result = await removeMentorAssignment(jobseekerId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error removing mentor assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing mentor assignment',
      error: error.message
    });
  }
});

// Get available mentors for assignment (Admin only)
// GET /api/mentor/available
router.get('/available', [protect, adminAuth], async (req, res) => {
  try {
    const { grade } = req.query;

    if (!grade || !['A', 'B'].includes(grade)) {
      return res.status(400).json({
        success: false,
        message: 'Valid grade (A or B) is required'
      });
    }

    const mentors = await User.find({
      $or: [
        { role: 'mentor' },
        { secondaryRoles: 'mentor' }
      ],
      'mentorProfile.grade': grade,
      'mentorProfile.currentMentees': { $lt: { $expr: '$mentorProfile.maxMentees' } },
      isActive: true
    }).select('name email mentorProfile.grade mentorProfile.currentMentees mentorProfile.maxMentees');

    res.json({
      success: true,
      data: mentors.map(mentor => ({
        id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        grade: mentor.mentorProfile.grade,
        currentMentees: mentor.mentorProfile.currentMentees,
        maxMentees: mentor.mentorProfile.maxMentees,
        availableSlots: mentor.mentorProfile.maxMentees - mentor.mentorProfile.currentMentees
      }))
    });
  } catch (error) {
    console.error('Error fetching available mentors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available mentors',
      error: error.message
    });
  }
});

// Update mentor grade (Admin only)
// PATCH /api/mentor/:mentorId/grade
router.patch('/:mentorId/grade', [protect, adminAuth], async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { grade } = req.body;

    if (!grade || !['A', 'B'].includes(grade)) {
      return res.status(400).json({
        success: false,
        message: 'Valid grade (A or B) is required'
      });
    }

    const mentor = await User.findById(mentorId);

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    if (!mentor.hasRole('mentor')) {
      return res.status(400).json({
        success: false,
        message: 'User is not a mentor'
      });
    }

    if (!mentor.mentorProfile) {
      mentor.mentorProfile = {};
    }

    mentor.mentorProfile.grade = grade;
    await mentor.save();

    res.json({
      success: true,
      message: 'Mentor grade updated successfully',
      data: {
        id: mentor._id,
        name: mentor.name,
        grade: mentor.mentorProfile.grade
      }
    });
  } catch (error) {
    console.error('Error updating mentor grade:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating mentor grade',
      error: error.message
    });
  }
});

// Update mentor capacity (Admin only)
// PATCH /api/mentor/:mentorId/capacity
router.patch('/:mentorId/capacity', [protect, adminAuth], async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { maxMentees } = req.body;

    if (!maxMentees || maxMentees < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid maxMentees (minimum 1) is required'
      });
    }

    const mentor = await User.findById(mentorId);

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    if (!mentor.hasRole('mentor')) {
      return res.status(400).json({
        success: false,
        message: 'User is not a mentor'
      });
    }

    if (!mentor.mentorProfile) {
      mentor.mentorProfile = {};
    }

    mentor.mentorProfile.maxMentees = maxMentees;
    await mentor.save();

    res.json({
      success: true,
      message: 'Mentor capacity updated successfully',
      data: {
        id: mentor._id,
        name: mentor.name,
        maxMentees: mentor.mentorProfile.maxMentees,
        currentMentees: mentor.mentorProfile.currentMentees
      }
    });
  } catch (error) {
    console.error('Error updating mentor capacity:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating mentor capacity',
      error: error.message
    });
  }
});

module.exports = router;

// Admin utilities to fix existing data
// POST /api/mentor/admin/process-selected
router.post('/admin/process-selected', [protect, adminAuth], async (req, res) => {
  try {
    const result = await processSelectedJobseekers();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing selected jobseekers:', error);
    res.status(500).json({ success: false, message: 'Failed to process selected jobseekers' });
  }
});

// POST /api/mentor/admin/process-queue
router.post('/admin/process-queue', [protect, adminAuth], async (req, res) => {
  try {
    const result = await processAssignmentQueue();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing assignment queue:', error);
    res.status(500).json({ success: false, message: 'Failed to process assignment queue' });
  }
});

// Submit feedback for a completed internship
// POST /api/mentor/submit-feedback/:applicationId
router.post('/submit-feedback/:applicationId', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const { applicationId } = req.params;
    const { rating, feedback, domain } = req.body;

    // Validate input
    if (!rating || !feedback) {
      return res.status(400).json({ success: false, message: 'Rating and feedback are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Find the application
    const application = await InternshipApplication.findById(applicationId)
      .populate('jobseekerId', 'name email')
      .populate('internshipId', 'title industry');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Verify this mentor is assigned to this application
    if (application.mentorId.toString() !== mentorId.toString()) {
      return res.status(403).json({ success: false, message: 'You are not the mentor for this application' });
    }

    // Calculate task stats for snapshot
    const totalTasks = await MentorTask.countDocuments({
      mentorId,
      assignedTo: application.jobseekerId._id
    });

    let completedTasks = 0;
    let pendingTasks = 0;

    if (totalTasks > 0) {
      const tasks = await MentorTask.find({
        mentorId,
        assignedTo: application.jobseekerId._id
      }).select('_id');
      const taskIds = tasks.map(t => t._id);

      completedTasks = await MentorSubmission.countDocuments({
        mentorId,
        menteeId: application.jobseekerId._id,
        taskId: { $in: taskIds },
        reviewStatus: { $ne: 'rejected' }
      });

      pendingTasks = totalTasks - completedTasks;
    }

    const progress = totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0;
    const feedbackDomain = domain || application.internshipDetails?.title || application.internshipId?.title || 'General';

    // Check if feedback already exists for this mentee+domain at 100% milestone
    const existing = await MilestoneFeedback.findOne({
      mentorId,
      menteeId: application.jobseekerId._id,
      domain: feedbackDomain,
      milestone: 100
    });

    if (existing) {
      // Update existing feedback
      existing.feedback = feedback;
      existing.rating = rating;
      existing.progressSnapshot = progress;
      existing.tasksSummary = { total: totalTasks, completed: completedTasks, pending: pendingTasks };
      await existing.save();

      // Send email notification to jobseeker
      try {
        const mentorUser = await User.findById(mentorId).select('name');
        await sendMilestoneFeedbackEmail(
          application.jobseekerId.email,
          application.jobseekerId.name,
          100,
          feedback,
          rating,
          mentorUser?.name || 'Your Mentor'
        );
      } catch (emailErr) {
        console.error('Failed to send feedback email:', emailErr.message);
      }

      return res.json({
        success: true,
        message: 'Feedback updated successfully',
        data: existing
      });
    }

    // Create new feedback
    const newFeedback = new MilestoneFeedback({
      mentorId,
      menteeId: application.jobseekerId._id,
      domain: feedbackDomain,
      milestone: 100,
      feedback,
      rating,
      progressSnapshot: progress,
      tasksSummary: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks
      }
    });

    await newFeedback.save();

    // Send email notification to jobseeker
    try {
      const mentorUser = await User.findById(mentorId).select('name');
      await sendMilestoneFeedbackEmail(
        application.jobseekerId.email,
        application.jobseekerId.name,
        100,
        feedback,
        rating,
        mentorUser?.name || 'Your Mentor'
      );
    } catch (emailErr) {
      console.error('Failed to send feedback email:', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: newFeedback
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Feedback already submitted for this milestone' });
    }
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback',
      error: error.message
    });
  }
});

// Check if feedback exists for a specific application
// GET /api/mentor/feedback-status/:applicationId
router.get('/feedback-status/:applicationId', [protect, mentorAuth], async (req, res) => {
  try {
    const mentorId = req.user._id;
    const application = await InternshipApplication.findById(req.params.applicationId)
      .populate('jobseekerId', 'name')
      .populate('internshipId', 'title');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const domain = application.internshipDetails?.title || application.internshipId?.title || 'General';

    const feedback = await MilestoneFeedback.findOne({
      mentorId,
      menteeId: application.jobseekerId._id,
      domain,
      milestone: 100
    });

    res.json({
      success: true,
      hasFeedback: !!feedback,
      data: feedback
    });

  } catch (error) {
    console.error('Error checking feedback status:', error);
    res.status(500).json({ success: false, message: 'Error checking feedback status' });
  }
});

// ==================== PROJECT IDEAS ====================

// @desc    Get all project ideas for review
// @route   GET /api/mentor/project-ideas
// @access  Private (Mentor)
router.get('/project-ideas', protect, mentorAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [ideas, total] = await Promise.all([
      ProjectIdea.find(filter)
        .populate('studentId', 'name email profile.college profile.course')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ProjectIdea.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        ideas,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalIdeas: total,
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching project ideas for mentor:', error);
    res.status(500).json({ success: false, message: 'Server error fetching project ideas' });
  }
});

// @desc    Review a project idea
// @route   PATCH /api/mentor/project-ideas/:id/review
// @access  Private (Mentor)
router.patch('/project-ideas/:id/review', protect, mentorAuth, async (req, res) => {
  try {
    const { status, adminFeedback } = req.body;
    
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const idea = await ProjectIdea.findById(req.params.id);
    if (!idea) {
      return res.status(404).json({ success: false, message: 'Project idea not found' });
    }

    idea.status = status;
    idea.adminFeedback = adminFeedback || idea.adminFeedback || '';
    idea.reviewedBy = req.user._id;
    idea.reviewedAt = new Date();

    await idea.save();

    res.json({
      success: true,
      message: `Project idea marked as ${status}`,
      data: idea
    });
  } catch (error) {
    console.error('Error reviewing project idea:', error);
    res.status(500).json({ success: false, message: 'Server error reviewing project idea' });
  }
});

module.exports = router;

const express = require('express');
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const Test = require('../models/Test');
const InternshipApplication = require('../models/InternshipApplication');
const User = require('../models/User');
// Use the new Gemini utility (formerly openai/hf_python)
const { generateTestQuestions, scoreAnswers } = require('../utils/gemini');
const { sendNotificationEmail } = require('../utils/emailService');
const { processTestResult } = require('../utils/mentorAssignment');

const router = express.Router();

// Get test details by token
// GET /api/tests/:token
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const testDoc = await Test.findOne({ token });
    if (!testDoc) return res.status(404).json({ success: false, message: 'Invalid test link' });

    const now = new Date();
    const expired = !!testDoc.submittedAt || now > new Date(testDoc.testExpiry);
    let internshipTitle = 'Assessment';
    try {
      const application = await InternshipApplication.findById(testDoc.applicationId);
      internshipTitle = application?.internshipDetails?.title || internshipTitle;
    } catch (_) { }
    const payload = {
      success: true,
      data: {
        applicationId: testDoc.applicationId,
        token: testDoc.token,
        expiresAt: testDoc.testExpiry,
        internshipTitle,
        durationMinutes: testDoc.durationMinutes || 60,
        // Strip any answerKey or hidden fields before sending to client
        questions: (testDoc.questions || []).map(q => {
          const { answerKey, ...rest } = q || {};
          return rest;
        }),
        submittedAt: testDoc.submittedAt,
        score: testDoc.score,
        result: testDoc.result,
        expired
      }
    };
    // After submission or expiry, expose candidate answers and objective correctness/solutions
    if (testDoc.submittedAt) {
      payload.data.answers = testDoc.answers || [];
      payload.data.correctness = Array.isArray(testDoc.correctness) ? testDoc.correctness : [];
      payload.data.solutions = (testDoc.questions || []).map(q => {
        if (!q) return { correctAnswer: null };
        const t = q.type || 'text';
        if (t === 'mcq' || t === 'oneword') {
          return { correctAnswer: q.answerKey ?? null };
        }
        return { correctAnswer: null };
      });
    }
    res.json(payload);
  } catch (err) {
    console.error('Fetch test error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch test' });
  }
});

// Preview questions without storing (for employer testing)
// POST /api/tests/preview { title, skills?[], model?, provider? }
router.post('/preview', protect, async (req, res) => {
  try {
    if (!['employer', 'company'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only employers can preview tests' });
    }
    const { title = 'Internship', skills = [] } = req.body || {};

    // Use Gemini for preview
    const questions = await generateTestQuestions(title, skills);
    return res.json({ success: true, data: { questions, provider: 'gemini' } });
  } catch (err) {
    console.error('Preview test error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate preview' });
  }
});

// Assign a test to a shortlisted candidate
// POST /api/tests/assign
// body: { applicationId, expiresInHours?, questions?, durationMinutes? }
router.post('/assign', protect, async (req, res) => {
  try {
    const { applicationId, expiresInHours = 24, questions: providedQuestions, durationMinutes = 60 } = req.body;
    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'applicationId is required' });
    }

    const application = await InternshipApplication.findById(applicationId);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    // Allow employer, company, or employee to assign tests
    if (!['employer', 'company', 'employee'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only employers or employees can assign tests' });
    }

    // For employer/company+employee checks...
    if (req.user.role === 'employee') {
      if (
        !req.user.employeeProfile?.companyId ||
        req.user.employeeProfile.companyId.toString() !== application.employerId.toString()
      ) {
        return res.status(403).json({ success: false, message: 'Not authorized for this application (company mismatch)' });
      }
    } else {
      if (application.employerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this application' });
      }
    }

    const token = uuidv4();
    const expiry = new Date(Date.now() + Number(expiresInHours) * 3600 * 1000);

    const title = application?.internshipDetails?.title || 'Internship';
    const skills = application?.skills?.technicalSkills || [];

    // Generate questions using Gemini if not provided
    let questions = providedQuestions;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      questions = await generateTestQuestions(title, skills);
    }

    // Fallback?
    if (!questions || questions.length === 0) {
      // Simple fallback if API fails
      questions = [
        { question: "Describe your experience with this role.", type: "text", answerKey: "N/A" }
      ];
    }

    // Link the test token via frontend landing route
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const testLink = `${frontendBase}/test/${token}`;

    const testDoc = await Test.create({
      applicationId: application._id,
      jobseekerId: application.jobseekerId,
      employerId: application.employerId,
      internshipId: application.internshipId,
      token,
      testLink,
      testExpiry: expiry,
      questions,
      durationMinutes
    });

    // Update application
    application.testLink = testLink;
    application.testExpiry = expiry;
    application.status = 'test-assigned';
    await application.save();

    // Email candidate
    const candidate = await User.findById(application.jobseekerId);
    if (candidate?.email) {
      const subject = 'Test Assigned';
      const message = `
        <p>Please complete your test at <a href="${testLink}">${testLink}</a>.</p>
        <p>Deadline: ${expiry.toLocaleString()}</p>
      `;
      await sendNotificationEmail(candidate.email, subject, message);
    }

    // Sanitize output
    const publicQuestions = (questions || []).map(q => {
      const { answerKey, ...rest } = q || {};
      return rest;
    });
    res.json({ success: true, data: { testId: testDoc._id, token, testLink, testExpiry: expiry, questions: publicQuestions } });
  } catch (err) {
    console.error('Assign test error:', err);
    res.status(500).json({ success: false, message: 'Failed to assign test' });
  }
});

// Reset a failed test
// POST /api/tests/reset
router.post('/reset', protect, async (req, res) => {
  try {
    const { applicationId } = req.body;
    if (!applicationId) return res.status(400).json({ success: false, message: 'applicationId is required' });

    const application = await InternshipApplication.findById(applicationId);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    if (!['employer', 'company'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only employers can reset tests' });
    }
    if (application.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (application.result !== 'Failed') {
      return res.status(400).json({ success: false, message: 'Can only reset failed tests' });
    }

    await Test.findOneAndDelete({ applicationId: application._id });

    application.testLink = null;
    application.testExpiry = null;
    application.answers = [];
    application.score = null;
    application.result = null;
    application.reason = null;
    application.status = 'shortlisted';
    await application.save();

    res.json({ success: true, message: 'Test reset successfully.' });
  } catch (err) {
    console.error('Reset test error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset test' });
  }
});

// Submit test answers and score
// POST /api/tests/submit
// body: { token, answers: [] }
router.post('/submit', async (req, res) => {
  try {
    const { token, answers } = req.body;
    if (!token || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'token and answers[] are required' });
    }

    const testDoc = await Test.findOne({ token });
    if (!testDoc) return res.status(404).json({ success: false, message: 'Invalid test link' });
    // if (testDoc.submittedAt) return res.status(400).json({ success: false, message: 'Test already submitted' });
    // Allow re-submit if needed or strict? User didn't specify. Assuming strict once submitted.
    if (testDoc.submittedAt) return res.status(400).json({ success: false, message: 'Test already submitted' });

    if (new Date() > new Date(testDoc.testExpiry)) {
      return res.status(400).json({ success: false, message: 'Test link has expired' });
    }

    // Score using Gemini
    const { score, result, correctness, percentage } = await scoreAnswers(testDoc.questions, answers);

    testDoc.answers = answers;
    testDoc.score = score; // This is the raw count of correct answers
    testDoc.result = result;
    testDoc.correctness = correctness;
    testDoc.submittedAt = new Date();
    testDoc.testExpiry = new Date(Date.now() - 1000); // Expire link
    await testDoc.save();

    // Calculate grade based on adjusted percentage (User logic: Score is out of 80)
    // Example: 75 score -> (75/80)*100 = 93.75% -> Grade A
    const adjustedPercentage = Math.min(100, Math.round(((percentage || 0) / 80) * 100));

    let grade = null;
    if (result === 'Passed') {
      if (adjustedPercentage >= 80) {
        grade = 'A';
      } else if (adjustedPercentage >= 60) {
        grade = 'B';
      }
    }

    // Construct solutions for frontend display
    const solutions = (testDoc.questions || []).map(q => {
      if (!q) return { correctAnswer: null };
      const t = q.type || 'text';
      if (t === 'mcq' || t === 'oneword') {
        return { correctAnswer: q.answerKey ?? null };
      }
      return { correctAnswer: null };
    });

    // Build comprehensive response
    const responseData = {
      score,
      percentage: adjustedPercentage, // Send adjusted percentage to frontend
      result,
      grade,
      answers,
      solutions,
      correctness,
      totalQuestions: testDoc.questions?.length || 0,
      correctAnswers: score
    };

    // Update application
    const application = await InternshipApplication.findById(testDoc.applicationId);
    let mentorAssignmentResult = null;
    if (application) {
      application.answers = answers;
      application.score = percentage; // Save Raw Score (75) to DB
      application.result = result;
      application.status = result === 'Passed' ? 'selected' : 'rejected';
      application.reason = result === 'Failed' ? 'test failed' : 'test passed';
      await application.save();

      // Process test result for grading and mentor assignment using ADJUSTED percentage
      if (result === 'Passed') {
        try {
          // Pass adjustedPercentage (e.g. 94) to mentor assignment
          mentorAssignmentResult = await processTestResult(application.jobseekerId, adjustedPercentage, result, application.employerId, application._id);
          console.log('Mentor assignment result:', mentorAssignmentResult);
        } catch (error) {
          console.error('Error processing mentor assignment:', error);
        }
      }

      // Notify candidate
      // Notify candidate (failures shouldn't block response)
      try {
        const candidate = await User.findById(application.jobseekerId);
        if (candidate?.email) {
          if (result === 'Failed') {
            const subject = 'Internship Test Result – Rejected';
            const message = `
              <p>Dear ${candidate.name || 'Candidate'},</p>
              <p>Thank you for completing the assessment. Unfortunately, you did not meet the passing criteria.</p>
              <p><strong>Score:</strong> ${adjustedPercentage}%</p>
              <p>We appreciate your effort and encourage you to apply again in the future.</p>
              <p>Best regards,<br/>${application?.internshipDetails?.title || 'Internship'} Team</p>
            `;
            await sendNotificationEmail(candidate.email, subject, message);
          } else if (result === 'Passed') {
            const type = application?.internshipDetails?.type || 'Internship';
            const subject = 'Internship Test Result – Selected';
            let message = `
              <p>Dear ${candidate.name || 'Candidate'},</p>
              <p>Congratulations! You have <strong>passed</strong> the assessment and have been selected for the ${type}.</p>
              <p><strong>Score:</strong> ${adjustedPercentage}%</p>
            `;

            if (mentorAssignmentResult && mentorAssignmentResult.success && mentorAssignmentResult.mentorAssigned) {
              message += `
                <p><strong>Grade:</strong> ${mentorAssignmentResult.grade}</p>
                <p><strong>Mentor Assigned:</strong> ${mentorAssignmentResult.mentor.name}</p>
                <p>Your mentor will contact you soon to begin your mentorship journey.</p>
              `;
            } else if (mentorAssignmentResult && mentorAssignmentResult.success) {
              message += `
                <p><strong>Grade:</strong> ${mentorAssignmentResult.grade}</p>
                <p>We are working on assigning you a mentor and will contact you soon.</p>
              `;
            } else {
              message += `<p>Our team will contact you shortly with next steps.</p>`;
            }

            message += `<p>Best regards,<br/>${application?.internshipDetails?.title || 'Internship'} Team</p>`;

            await sendNotificationEmail(candidate.email, subject, message);
          }
        }
      } catch (emailError) {
        console.error('Error sending test result email:', emailError);
      }
    }

    // Add mentor assignment info if available
    if (mentorAssignmentResult) {
      responseData.mentorAssignment = {
        success: mentorAssignmentResult.success,
        mentorAssigned: mentorAssignmentResult.mentorAssigned || false,
        grade: mentorAssignmentResult.grade,
        message: mentorAssignmentResult.message
      };
      if (mentorAssignmentResult.mentor) {
        responseData.mentorAssignment.mentor = {
          name: mentorAssignmentResult.mentor.name,
          email: mentorAssignmentResult.mentor.email
        };
      }
    }

    res.json({ success: true, data: responseData });
  } catch (err) {
    console.error('Submit test error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit test' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  sendMentorCredentials,
  sendNotificationEmail,
  sendWelcomeEmail,
  sendShortlistEmail,
  sendRejectionEmail,
  createTransporter
} = require('../utils/emailService');

// Check email service status
router.get('/status', protect, async (req, res) => {
  try {
    const status = {
      configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      emailUser: process.env.EMAIL_USER ? 'Set' : 'Not Set',
      frontendUrl: process.env.FRONTEND_URL || 'Not Set',
      transporter: null,
      error: null
    };

    if (status.configured) {
      try {
        const transporter = createTransporter();
        await transporter.verify();
        status.transporter = 'Verified';
      } catch (error) {
        status.transporter = 'Failed';
        status.error = error.message;
      }
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking email status',
      error: error.message
    });
  }
});

// Test single email type
router.post('/test', protect, async (req, res) => {
  try {
    const { email, emailType = 'notification' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    let testResult;
    let emailName;

    switch (emailType) {
      case 'welcome':
        emailName = 'Welcome Email';
        testResult = await sendWelcomeEmail(email, 'Test User', 'jobseeker');
        break;
      case 'shortlist':
        emailName = 'Shortlist Email';
        testResult = await sendShortlistEmail(email, 'Test User', 'Test Company', 'Test Internship');
        break;
      case 'rejection':
        emailName = 'Rejection Email';
        testResult = await sendRejectionEmail(email, 'Test User', 'Test Company', 'Test Internship');
        break;
      case 'mentor':
        emailName = 'Mentor Credentials Email';
        testResult = await sendMentorCredentials(email, 'Test Mentor', 'testpass123', 'Test Company');
        break;
      case 'notification':
      default:
        emailName = 'Notification Email';
        testResult = await sendNotificationEmail(
          email,
          'SkillSyncer Email Test',
          `
            <h2>Email Configuration Test</h2>
            <p>If you receive this email, your email configuration is working correctly!</p>
            <p>Sent at: ${new Date().toISOString()}</p>
            <p>Email Type: ${emailName}</p>
          `
        );
        break;
    }

    res.json({
      success: testResult.success,
      message: testResult.success 
        ? `${emailName} sent successfully. Check ${email} inbox (and spam folder).` 
        : `Failed to send ${emailName}`,
      emailType: emailName,
      messageId: testResult.messageId || null,
      error: testResult.error || null,
      code: testResult.code || null
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message
    });
  }
});

// Test all email types
router.post('/test-all', protect, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const results = {
      email,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };

    // Test 1: Notification Email
    results.summary.total++;
    let result = await sendNotificationEmail(
      email,
      'Test: Notification Email',
      '<p>This is a test notification email.</p>'
    );
    results.tests.push({
      type: 'Notification Email',
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });
    if (result.success) results.summary.passed++;
    else results.summary.failed++;

    // Test 2: Welcome Email
    results.summary.total++;
    result = await sendWelcomeEmail(email, 'Test User', 'jobseeker');
    results.tests.push({
      type: 'Welcome Email (Jobseeker)',
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });
    if (result.success) results.summary.passed++;
    else results.summary.failed++;

    // Test 3: Shortlist Email
    results.summary.total++;
    result = await sendShortlistEmail(email, 'Test User', 'Test Company', 'Test Internship');
    results.tests.push({
      type: 'Shortlist Email',
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });
    if (result.success) results.summary.passed++;
    else results.summary.failed++;

    // Test 4: Rejection Email
    results.summary.total++;
    result = await sendRejectionEmail(email, 'Test User', 'Test Company', 'Test Internship');
    results.tests.push({
      type: 'Rejection Email',
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });
    if (result.success) results.summary.passed++;
    else results.summary.failed++;

    // Test 5: Mentor Credentials Email
    results.summary.total++;
    result = await sendMentorCredentials(email, 'Test Mentor', 'testpass123', 'Test Company');
    results.tests.push({
      type: 'Mentor Credentials Email',
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });
    if (result.success) results.summary.passed++;
    else results.summary.failed++;

    res.json({
      success: results.summary.failed === 0,
      message: `Email tests completed. ${results.summary.passed}/${results.summary.total} passed.`,
      data: results
    });
  } catch (error) {
    console.error('Error testing all emails:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing emails',
      error: error.message
    });
  }
});

module.exports = router;

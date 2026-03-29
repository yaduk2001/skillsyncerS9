const nodemailer = require('nodemailer');

// Create transporter using the email configuration from .env
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send mentor credentials email
const sendMentorCredentials = async (mentorEmail, mentorName, tempPassword, companyName = '') => {
  console.log('🔄 Attempting to send mentor credentials email...');
  console.log('📧 To:', mentorEmail);
  console.log('👤 Name:', mentorName);
  console.log('📧 From:', process.env.EMAIL_USER);

  try {
    const transporter = createTransporter();

    // Verify transporter configuration
    console.log('🔍 Verifying transporter...');
    await transporter.verify();
    console.log('✅ Transporter verified successfully');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: mentorEmail,
      subject: 'Welcome to SkillSyncer - Mentor Account Created',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Welcome to SkillSyncer!</h2>
          <p>Dear ${mentorName},</p>
          <p>Your mentor account has been created successfully${companyName ? ` for ${companyName}` : ''}. Here are your login credentials:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${mentorEmail}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            ${companyName ? `<p><strong>Company:</strong> ${companyName}</p>` : ''}
          </div>
          
          <p><strong>Password Information:</strong> Your password is auto-generated based on your name, company, and phone number for easy memorization.</p>
          
          <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
          
          <p>You can log in at: <a href="${process.env.FRONTEND_URL}/auth">${process.env.FRONTEND_URL}/auth</a></p>
          
          <p>Welcome to the SkillSyncer community!</p>
          
          <p>Best regards,<br>SkillSyncer Team</p>
        </div>
      `
    };

    console.log('📤 Sending email...');
    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending mentor credentials email:', error);
    console.error('❌ Error details:', error.message);
    if (error.code) console.error('❌ Error code:', error.code);
    return { success: false, error: error.message, code: error.code };
  }
};

// Send notification email
const sendNotificationEmail = async (recipientEmail, subject, message) => {
  console.log('🔄 Attempting to send notification email...');
  console.log('📧 To:', recipientEmail);
  console.log('📧 Subject:', subject);
  console.log('📧 From:', process.env.EMAIL_USER);

  try {
    // Validate email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email configuration missing: EMAIL_USER or EMAIL_PASS not set');
      return { success: false, error: 'Email configuration missing' };
    }

    if (!recipientEmail || !subject) {
      console.error('❌ Missing required parameters: recipientEmail or subject');
      return { success: false, error: 'Missing required parameters' };
    }

    const transporter = createTransporter();

    // Verify transporter
    try {
      await transporter.verify();
      console.log('✅ Transporter verified successfully');
    } catch (verifyError) {
      console.error('❌ Transporter verification failed:', verifyError.message);
      return { success: false, error: 'Email service configuration invalid', details: verifyError.message };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">SkillSyncer Notification</h2>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${message}
          </div>
          <p>Best regards,<br>SkillSyncer Team</p>
        </div>
      `
    };

    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Notification email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending notification email:', error);
    console.error('❌ Error details:', error.message);
    if (error.code) console.error('❌ Error code:', error.code);
    return { success: false, error: error.message, code: error.code };
  }
};

// Send welcome email for new registrations
const sendWelcomeEmail = async (userEmail, userName, userRole) => {
  try {
    const transporter = createTransporter();

    const roleSpecificContent = {
      jobseeker: {
        title: 'Welcome to SkillSyncer - Your Career Journey Starts Here!',
        content: `
          <p>As a job seeker, you now have access to:</p>
          <ul>
            <li>Browse and apply for job opportunities</li>
            <li>Build and showcase your professional profile</li>
            <li>Connect with mentors and industry professionals</li>
            <li>Access career development resources</li>
          </ul>
        `
      },
      employer: {
        title: 'Welcome to SkillSyncer - Find Your Next Great Hire!',
        content: `
          <p>As an employer, you can now:</p>
          <ul>
            <li>Post job openings and internship opportunities</li>
            <li>Search and connect with talented candidates</li>
            <li>Manage your hiring process efficiently</li>
            <li>Build your company's talent pipeline</li>
          </ul>
        `
      },
      mentor: {
        title: 'Welcome to SkillSyncer - Share Your Expertise!',
        content: `
          <p>As a mentor, you can:</p>
          <ul>
            <li>Guide and support job seekers in their career journey</li>
            <li>Share your industry knowledge and experience</li>
            <li>Build meaningful professional relationships</li>
            <li>Contribute to the next generation's success</li>
          </ul>
        `
      }
    };

    const content = roleSpecificContent[userRole] || roleSpecificContent.jobseeker;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: content.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">${content.title}</h2>
          <p>Dear ${userName},</p>
          <p>Welcome to SkillSyncer! We're excited to have you join our community.</p>
          
          ${content.content}
          
          <p>Get started by logging into your account: <a href="${process.env.FRONTEND_URL}/auth">${process.env.FRONTEND_URL}/auth</a></p>
          
          <p>If you have any questions, feel free to reach out to our support team.</p>
          
          <p>Best regards,<br>SkillSyncer Team</p>
        </div>
      `
    };

    console.log('📤 Sending welcome email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    console.error('❌ Error details:', error.message);
    if (error.code) console.error('❌ Error code:', error.code);
    return { success: false, error: error.message, code: error.code };
  }
};

// Send shortlist notification email to jobseeker (now matches requested template)
const sendShortlistEmail = async (toEmail, toName, companyName, internshipTitle, nextSteps = '') => {
  try {
    const transporter = createTransporter();

    const subject = 'Internship Application Status – Shortlisted';
    const messageHtml = `
      <p>Dear ${toName},</p>
      <p>Congratulations! Your internship application has been <strong>shortlisted</strong>.</p>
      <p>You are required to complete a test as the next step in the selection process. Please log in to your account to find the test details.</p>
      <p><a href="${process.env.FRONTEND_URL}/jobseeker-dashboard" target="_blank" rel="noopener">Go to your account</a></p>
      <p>If you pass the test, you will be selected for the internship.</p>
      <p>If you do not pass, your application will be rejected.</p>
      <p>We wish you the best of luck!</p>
      <p>Best regards,<br>${companyName} Team</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; text-align: center;">Internship Application Status – Shortlisted</h2>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${messageHtml}
          </div>
      <p>Best regards,<br/>${companyName} & SkillSyncer Team</p>
        </div>
      `
    };

    console.log('📤 Sending shortlist email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Shortlist email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending shortlist email:', error);
    console.error('❌ Error details:', error.message);
    if (error.code) console.error('❌ Error code:', error.code);
    return { success: false, error: error.message, code: error.code };
  }
};

// Send rejection notification email to jobseeker
const sendRejectionEmail = async (toEmail, toName, companyName, internshipTitle, reason = '') => {
  try {
    const transporter = createTransporter();

    const subject = `Update on your application for ${internshipTitle} at ${companyName}`;
    const messageHtml = `
      <p>Dear ${toName},</p>
      <p>Thank you for your interest in the <strong>${internshipTitle}</strong> opportunity at <strong>${companyName}</strong>. After careful consideration, we will not be moving forward with your application at this time.</p>
      ${reason ? `<p><strong>Note:</strong> ${reason}</p>` : ''}
      <p>We sincerely appreciate the time you invested in applying. We encourage you to explore other opportunities on SkillSyncer that may align with your profile.</p>
      <p><a href="${process.env.FRONTEND_URL}/internships" target="_blank" rel="noopener">Browse internships</a></p>
      <p>We wish you the best in your search and future endeavors.</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Application Update</h2>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${messageHtml}
          </div>
          <p>Best regards,<br/>${companyName} & SkillSyncer Team</p>
        </div>
      `
    };

    console.log('📤 Sending rejection email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Rejection email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending rejection email:', error);
    console.error('❌ Error details:', error.message);
    if (error.code) console.error('❌ Error code:', error.code);
    return { success: false, error: error.message, code: error.code };
  }
};

// Send employee credentials email
const sendEmployeeCredentials = async (toEmail, toName, password, companyName) => {
  try {
    const transporter = createTransporter();

    // Verify transporter
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('❌ Transporter verification failed:', verifyError.message);
      return { success: false, error: 'Email service configuration invalid', details: verifyError.message };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: 'Welcome to SkillSyncer - Employee Account Created',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Welcome to SkillSyncer!</h2>
          <p>Dear ${toName},</p>
          <p>Your employee account has been approved and created successfully!</p>
          <p><strong>Company:</strong> ${companyName}</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Login Credentials:</strong></p>
            <p><strong>Email:</strong> ${toEmail}</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
          </div>
          
          <p>Please log in to your account and change your password for security purposes.</p>
          <p>You can log in at: <a href="${process.env.FRONTEND_URL}/auth">${process.env.FRONTEND_URL}/auth</a></p>
          
          <p>Welcome to the SkillSyncer family!</p>
          <br>
          <p>Best regards,<br>SkillSyncer Team</p>
        </div>
      `
    };

    console.log('📤 Sending employee credentials email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Employee credentials email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending employee credentials email:', error);
    return { success: false, error: error.message };
  }
};

// Send request rejection email (Generic for Mentor/Employee requests)
const sendRequestRejectionEmail = async (toEmail, toName, type, companyName, reason = '') => {
  try {
    const transporter = createTransporter();
    // Verify transporter
    try { await transporter.verify(); } catch (_) { }

    const subject = `Update on your ${type} application at ${companyName}`; // e.g. "Mentor" or "Employee"

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Application Update</h2>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
             <p>Dear ${toName},</p>
             <p>We’re sorry — your ${type.toLowerCase()} application for <strong>${companyName}</strong> was not approved at this time.</p>
             ${reason ? `<p><strong>Reason provided:</strong> ${reason}</p>` : ''}
             <p>We appreciate your interest and encourage you to reapply in the future or explore other opportunities.</p>
             <p>If you believe this was a mistake, please reply to this email.</p>
          </div>
          <p>Best regards,<br>SkillSyncer Team</p>
        </div>
      `
    };

    console.log(`📤 Sending ${type} rejection email...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ ${type} rejection email sent successfully!`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending ${type} rejection email:`, error);
    return { success: false, error: error.message };
  }
};

// Send task approval email to jobseeker
const sendTaskApprovalEmail = async (menteeEmail, menteeName, taskTitle, mentorName, feedback = '', progress = 0) => {
  try {
    const transporter = createTransporter();

    const nextMilestone = progress < 25 ? 25 : progress < 50 ? 50 : progress < 75 ? 75 : 100;
    const subject = `Task Approved - ${taskTitle}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: menteeEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981; text-align: center;">✓ Task Approved!</h2>
          <p>Dear ${menteeName},</p>
          <p>Great work! Your mentor <strong>${mentorName}</strong> has approved your submission for:</p>
          
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; font-size: 16px; font-weight: bold;">${taskTitle}</p>
          </div>
          
          ${feedback ? `
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e40af;">Mentor Feedback:</p>
              <p style="margin: 0; color: #1e3a8a;">${feedback}</p>
            </div>
          ` : ''}
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-weight: bold;">Your Progress:</p>
            <div style="background-color: #e5e7eb; border-radius: 10px; height: 20px; overflow: hidden;">
              <div style="background: linear-gradient(to right, #8b5cf6, #6366f1); height: 100%; width: ${progress}%; transition: width 0.5s;"></div>
            </div>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">${progress.toFixed(1)}% Complete</p>
            ${progress < 100 ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Next milestone: ${nextMilestone}%</p>` : ''}
          </div>
          
          <p>Keep up the excellent work!</p>
          
          <p>You can view your progress at: <a href="${process.env.FRONTEND_URL}/jobseeker-dashboard">Your Dashboard</a></p>
          
          <p>Best regards,<br>${mentorName} & SkillSyncer Team</p>
        </div>
      `
    };

    console.log('📤 Sending task approval email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Task approval email sent successfully!');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending task approval email:', error);
    return { success: false, error: error.message };
  }
};

// Send task rejection email to jobseeker
const sendTaskRejectionEmail = async (menteeEmail, menteeName, taskTitle, mentorName, feedback) => {
  try {
    const transporter = createTransporter();

    const subject = `Task Revision Required - ${taskTitle}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: menteeEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444; text-align: center;">Revision Required</h2>
          <p>Dear ${menteeName},</p>
          <p>Your mentor <strong>${mentorName}</strong> has reviewed your submission for <strong>${taskTitle}</strong> and is requesting revisions.</p>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #991b1b;">Mentor Feedback:</p>
            <p style="margin: 0; color: #7f1d1d; white-space: pre-wrap;">${feedback}</p>
          </div>
          
          <div style="background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-weight: bold; color: #92400e;">📝 Next Steps:</p>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #78350f;">
              <li>Review the feedback carefully</li>
              <li>Make the necessary corrections</li>
              <li>Re-upload your improved submission</li>
            </ul>
          </div>
          
          <p>Don't worry! This is a great learning opportunity. Use the feedback to improve your work.</p>
          
          <p>Re-upload your submission at: <a href="${process.env.FRONTEND_URL}/jobseeker-dashboard">Your Dashboard</a></p>
          
          <p>Best regards,<br>${mentorName} & SkillSyncer Team</p>
        </div>
      `
    };

    console.log('📤 Sending task rejection email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Task rejection email sent successfully!');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending task rejection email:', error);
    return { success: false, error: error.message };
  }
};

// Send milestone feedback email to jobseeker
const sendMilestoneFeedbackEmail = async (menteeEmail, menteeName, milestone, feedback, rating = null, mentorName) => {
  try {
    const transporter = createTransporter();

    const subject = `🎉 ${milestone}% Milestone Achieved - Mentor Feedback`;
    const stars = rating ? '⭐'.repeat(rating) : '';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: menteeEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8b5cf6; text-align: center;">🎉 Milestone Achievement!</h2>
          <p>Dear ${menteeName},</p>
          <p><strong>Congratulations!</strong> You've reached the <strong>${milestone}%</strong> milestone in your learning journey!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="font-size: 48px; font-weight: bold; margin-bottom: 10px;">${milestone}%</div>
              <div style="font-size: 16px; opacity: 0.9;">Progress Milestone</div>
            </div>
          </div>
          
          <div style="background-color: #f5f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #5b21b6;">Mentor Feedback from ${mentorName}:</p>
            <p style="margin: 0; color: #6b21a8; white-space: pre-wrap;">${feedback}</p>
            ${rating ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd6fe;">
                <p style="margin: 0; font-size: 14px; color: #7c3aed;">Rating: <span style="font-size: 18px;">${stars}</span> (${rating}/5)</p>
              </div>
            ` : ''}
          </div>
          
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #065f46;">✨ Keep Going!</p>
            <p style="margin: 8px 0 0 0; color: #047857;">You're making excellent progress. Continue with the same dedication to reach your next milestone!</p>
          </div>
          
          <p>View your full progress and feedback at: <a href="${process.env.FRONTEND_URL}/jobseeker-dashboard">Your Dashboard</a></p>
          
          <p>Best regards,<br>${mentorName} & SkillSyncer Team</p>
        </div>
      `
    };

    console.log('📤 Sending milestone feedback email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Milestone feedback email sent successfully!');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending milestone feedback email:', error);
    return { success: false, error: error.message };
  }
};

// Send meeting scheduled email to jobseeker
const sendMeetingScheduledEmail = async (menteeEmail, menteeName, meetingTitle, dateTime, meetingLink, mentorName, domain, message = '') => {
  try {
    const transporter = createTransporter();

    const meetingDate = new Date(dateTime);
    const formattedDate = meetingDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const formattedTime = meetingDate.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const subject = `📅 Meeting Scheduled — ${meetingTitle}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: menteeEmail,
      subject,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%); padding: 40px 32px 32px; border-radius: 12px 12px 0 0; text-align: center;">
            <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 14px; padding: 12px 14px; margin-bottom: 16px;">
              <span style="font-size: 32px;">📅</span>
            </div>
            <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 6px 0; font-weight: 700; letter-spacing: -0.3px;">Meeting Scheduled</h1>
            <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0;">Your mentor has scheduled a session for you</p>
          </div>

          <!-- Body -->
          <div style="background: #ffffff; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Hi <strong>${menteeName}</strong>,
            </p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
              Your mentor <strong style="color: #6366f1;">${mentorName}</strong> has scheduled a meeting. Please find the details below:
            </p>

            <!-- Meeting Details Card -->
            <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border: 1px solid #ddd6fe; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <h2 style="color: #4c1d95; font-size: 18px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.2px;">
                ${meetingTitle}
              </h2>

              <!-- Domain -->
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <div style="background: #8b5cf6; border-radius: 6px; padding: 4px 10px; display: inline-block;">
                  <span style="color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 0.3px;">${domain}</span>
                </div>
              </div>

              <!-- Date -->
              <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                <div style="flex-shrink: 0; margin-right: 12px; margin-top: 2px;">
                  <span style="font-size: 16px;">🗓️</span>
                </div>
                <div>
                  <p style="margin: 0; font-size: 13px; color: #7c3aed; font-weight: 600;">Date</p>
                  <p style="margin: 2px 0 0 0; font-size: 15px; color: #1e1b4b; font-weight: 500;">${formattedDate}</p>
                </div>
              </div>

              <!-- Time -->
              <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                <div style="flex-shrink: 0; margin-right: 12px; margin-top: 2px;">
                  <span style="font-size: 16px;">⏰</span>
                </div>
                <div>
                  <p style="margin: 0; font-size: 13px; color: #7c3aed; font-weight: 600;">Time</p>
                  <p style="margin: 2px 0 0 0; font-size: 15px; color: #1e1b4b; font-weight: 500;">${formattedTime}</p>
                </div>
              </div>

              <!-- Mentor -->
              <div style="display: flex; align-items: flex-start;">
                <div style="flex-shrink: 0; margin-right: 12px; margin-top: 2px;">
                  <span style="font-size: 16px;">👤</span>
                </div>
                <div>
                  <p style="margin: 0; font-size: 13px; color: #7c3aed; font-weight: 600;">Mentor</p>
                  <p style="margin: 2px 0 0 0; font-size: 15px; color: #1e1b4b; font-weight: 500;">${mentorName}</p>
                </div>
              </div>
            </div>

            ${message ? `
              <!-- Mentor Message -->
              <div style="background: #fefce8; border-left: 4px solid #eab308; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #854d0e; font-weight: 700;">💬 Message from ${mentorName}:</p>
                <p style="margin: 0; font-size: 14px; color: #713f12; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            ` : ''}

            <!-- Join Button -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="${meetingLink}" target="_blank" rel="noopener" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 40px; border-radius: 10px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(99,102,241,0.4);">
                🔗 Join Meeting
              </a>
            </div>

            <!-- Reminder -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 10px;">
              <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">✅ Quick Reminders:</p>
              <ul style="margin: 8px 0 0 0; padding-left: 18px; color: #15803d; font-size: 13px; line-height: 1.8;">
                <li>Join the meeting 2-3 minutes early</li>
                <li>Keep your camera and mic ready</li>
                <li>Have any questions prepared beforehand</li>
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 20px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #64748b;">Best regards,<br/><strong>${mentorName}</strong> & SkillSyncer Team</p>
          </div>
        </div>
      `
    };

    console.log('📤 Sending meeting scheduled email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Meeting scheduled email sent successfully!');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending meeting scheduled email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendMentorCredentials,
  sendNotificationEmail,
  sendWelcomeEmail,
  createTransporter,
  sendShortlistEmail,
  sendRejectionEmail,
  sendEmployeeCredentials,
  sendRequestRejectionEmail,
  sendTaskApprovalEmail,
  sendTaskRejectionEmail,
  sendMilestoneFeedbackEmail,
  sendMeetingScheduledEmail
};
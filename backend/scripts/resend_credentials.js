const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const User = require('../models/User');
const { sendMentorCredentials, sendNotificationEmail } = require('../utils/emailService');

const TARGET_EMAIL = 'salumanoj2026@mca.ajce.in';

const resendCredentials = async () => {
    try {
        // 1. Connect to Database
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        // 2. Find User
        const user = await User.findOne({ email: TARGET_EMAIL }).populate('employeeProfile.companyId');

        if (!user) {
            console.error(`❌ User not found with email: ${TARGET_EMAIL}`);
            process.exit(1);
        }

        console.log(`✅ User found: ${user.name} (Role: ${user.role})`);
        if (user.secondaryRoles && user.secondaryRoles.length > 0) {
            console.log(`ℹ️  Secondary Roles: ${user.secondaryRoles.join(', ')}`);
        }

        // 3. Generate New Temporary Password
        // Use a strong default pattern: Name + 2025 + !
        const namePart = user.name.replace(/\s+/g, '').substring(0, 4);
        const newPassword = `${namePart}2026!`;

        console.log(`🔄 Resetting password to: ${newPassword}`);
        user.password = newPassword;
        await user.save();
        console.log('✅ Password updated in database');

        // 4. Send Email based on Role
        let emailResult;

        if (user.role === 'mentor' || (user.secondaryRoles && user.secondaryRoles.includes('mentor'))) {
            console.log('📧 Sending Mentor Credentials Email...');
            // For mentors (or dual role), use the dedicated function
            emailResult = await sendMentorCredentials(
                user.email,
                user.name,
                newPassword,
                user.mentorProfile?.company || 'SkillSyncer' // Fallback company name
            );
        } else if (user.role === 'employee') {
            console.log('📧 Sending Employee Credentials Email...');
            // For employees, construct the notification manually as per admin.js logic
            const companyName = user.employeeProfile?.companyId?.name || 'SkillSyncer';

            emailResult = await sendNotificationEmail(
                user.email,
                'Your Login Credentials - SkillSyncer',
                `
              <h2>Login Credentials</h2>
              <p>Dear ${user.name},</p>
              <p>Here are your updated login credentials for SkillSyncer.</p>
              <p><strong>Company:</strong> ${companyName}</p>
              <p><strong>Login Credentials:</strong></p>
              <ul>
                <li><strong>Email:</strong> ${user.email}</li>
                <li><strong>Password:</strong> ${newPassword}</li>
              </ul>
              <p>Please login to your account and change your password immediately.</p>
              <p>You can log in here: <a href="${process.env.FRONTEND_URL}/auth">${process.env.FRONTEND_URL}/auth</a></p>
              <br>
              <p>Best regards,<br>SkillSyncer Team</p>
            `
            );
        } else {
            console.log('📧 Sending Standard Credentials Email...');
            // Fallback for other roles (Company/Jobseeker) if needed
            emailResult = await sendNotificationEmail(
                user.email,
                'Your Login Credentials - SkillSyncer',
                `
              <h2>Login Credentials</h2>
              <p>Dear ${user.name},</p>
              <p>Here are your updated login credentials for SkillSyncer.</p>
              <ul>
                <li><strong>Email:</strong> ${user.email}</li>
                <li><strong>Password:</strong> ${newPassword}</li>
              </ul>
              <p>Please login to your account and change your password immediately.</p>
              <p>You can log in here: <a href="${process.env.FRONTEND_URL}/auth">${process.env.FRONTEND_URL}/auth</a></p>
            `
            );
        }

        if (emailResult.success) {
            console.log('✅ Email sent successfully!');
            console.log('Message ID:', emailResult.messageId);
        } else {
            console.error('❌ Failed to send email:', emailResult.error);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

resendCredentials();

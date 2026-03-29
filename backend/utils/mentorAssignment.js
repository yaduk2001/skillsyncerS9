/**
 * Mentor Allocation Module
 * Enhanced utilities for automatic mentor assignment based on test scores.
 * 
 * Matching Logic:
 * 1. FIRST: Match by Company (jobseeker must be assigned to mentor from the same company)
 * 2. THEN: Match by Grade
 *    - Score >= 80%: Grade A (assigned to Grade A mentor)
 *    - Score >= 60% and < 80%: Grade B (assigned to Grade B mentor)
 *    - Score < 60%: Failed test, no mentor assignment
 */

const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication');
const { sendNotificationEmail } = require('./emailService');

/**
 * Calculate Grade based on Score Percentage
 * @param {number} percentage 
 * @returns {string|null} 'A', 'B', or null
 */
const calculateGrade = (percentage) => {
    if (percentage >= 80) return 'A';
    if (percentage >= 60) return 'B';
    return null; // < 60% doesn't qualify for mentor
};

/**
 * Process Test Result: Calculate Grade & Trigger Automatic Allocation
 * Called when a jobseeker submits a test
 * @param {string} jobseekerId 
 * @param {number} percentage 
 * @param {string} result ('Passed' or 'Failed')
 * @param {string|null} employerId
 * @param {string|null} applicationId
 */
const processTestResult = async (jobseekerId, percentage, result, employerId = null, applicationId = null) => {
    console.log(`[MentorAllocation] Processing result for ${jobseekerId}. %: ${percentage}, Result: ${result}`);

    if (result !== 'Passed') {
        return { success: true, message: "Candidate did not pass.", mentorAssigned: false };
    }

    const grade = calculateGrade(percentage);

    // Update Jobseeker Profile with Grade
    const user = await User.findById(jobseekerId);
    if (user) {
        if (!user.profile) user.profile = {};
        user.profile.grade = grade;
        await user.save();
        console.log(`[MentorAllocation] Updated ${user.name} with grade ${grade}`);
    }

    if (!grade) {
        return {
            success: true,
            grade: null,
            message: "Passed but score below 60%, no mentor assignment.",
            mentorAssigned: false
        };
    }

    // Trigger automatic mentor allocation based on company + grade
    return await allocateMentor(jobseekerId, grade, employerId, applicationId);
};

/**
 * Find the Company ID from jobseeker's selected application
 * @param {string} jobseekerId 
 * @returns {Object|null} - { companyId, companyName } or null
 */
const findJobseekerCompany = async (jobseekerId) => {
    try {
        // Find the most recent selected application for this jobseeker
        const application = await InternshipApplication.findOne({
            jobseekerId: jobseekerId,
            status: 'selected'
        }).sort({ updatedAt: -1 }).populate('employerId', 'name company email');

        if (!application) {
            console.log(`[MentorAllocation] No selected application found for jobseeker ${jobseekerId}`);
            return null;
        }

        const employerId = application.employerId?._id || application.employerId;
        const companyName = application.employerId?.company?.name ||
            application.employerId?.name ||
            application.internshipDetails?.companyName ||
            'Unknown Company';

        console.log(`[MentorAllocation] Found company for jobseeker: ${companyName} (${employerId})`);

        return {
            companyId: employerId,
            companyName: companyName,
            application: application
        };
    } catch (error) {
        console.error('[MentorAllocation] Error finding jobseeker company:', error);
        return null;
    }
};

/**
 * Find Best Available Mentor by Company FIRST, then Grade
 * @param {string} companyId - The employer/company ID
 * @param {string} grade - 'A' or 'B'
 * @returns {Object|null} - Best mentor or null
 */
const findBestMentor = async (companyId, grade) => {
    try {
        console.log(`[MentorAllocation] Searching for Grade ${grade} mentor in company ${companyId}...`);

        // Find all active mentors with matching grade who belong to this company
        const mentors = await User.find({
            $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
            isActive: true,
            'mentorProfile.grade': grade
        }).select('name email mentorProfile employeeProfile');

        if (!mentors || mentors.length === 0) {
            console.log(`[MentorAllocation] No Grade ${grade} mentors found in the system.`);
            return null;
        }

        // Filter mentors who belong to this specific company
        // Mentors are linked to companies via employeeProfile.companyId
        const companyMentors = mentors.filter(m => {
            const mentorCompanyId = m.employeeProfile?.companyId?.toString();
            return mentorCompanyId === companyId.toString();
        });

        if (companyMentors.length === 0) {
            console.log(`[MentorAllocation] No Grade ${grade} mentors found for company ${companyId}.`);
            return null;
        }

        console.log(`[MentorAllocation] Found ${companyMentors.length} Grade ${grade} mentor(s) in this company.`);

        // Filter mentors with available capacity and sort by current mentees (load balancing)
        const availableMentors = companyMentors
            .filter(m => {
                const current = m.mentorProfile?.currentMentees || 0;
                const max = m.mentorProfile?.maxMentees || 5;
                return current < max;
            })
            .sort((a, b) => {
                const currentA = a.mentorProfile?.currentMentees || 0;
                const currentB = b.mentorProfile?.currentMentees || 0;
                return currentA - currentB; // Ascending order - least loaded first
            });

        if (availableMentors.length === 0) {
            console.log(`[MentorAllocation] All Grade ${grade} mentors in company ${companyId} are at capacity.`);
            return null;
        }

        // Return the mentor with the least mentees
        const bestMentor = availableMentors[0];
        console.log(`[MentorAllocation] Best mentor found: ${bestMentor.name} (${bestMentor.mentorProfile?.currentMentees || 0}/${bestMentor.mentorProfile?.maxMentees || 5} mentees)`);

        return bestMentor;
    } catch (error) {
        console.error('[MentorAllocation] Error finding best mentor:', error);
        return null;
    }
};

/**
 * Allocate Mentor Based on Company + Grade
 * @param {string} jobseekerId 
 * @param {string} gradeOverride (Optional - use if grade already known)
 * @param {string} companyIdOverride (Optional)
 * @param {string} applicationIdOverride (Optional - to link mentor to specific app)
 */
const allocateMentor = async (jobseekerId, gradeOverride = null, companyIdOverride = null, applicationIdOverride = null) => {
    try {
        const jobseeker = await User.findById(jobseekerId);
        if (!jobseeker) return { success: false, message: "Jobseeker not found" };

        const grade = gradeOverride || jobseeker.profile?.grade;
        if (!grade) return { success: false, message: "No grade available for allocation." };

        // STEP 1: Identify the Target Company & Application
        let companyInfo = null;

        if (applicationIdOverride) {
            // Priority: If Application ID provided, use it
            const app = await InternshipApplication.findById(applicationIdOverride).populate('employerId', 'name company');
            if (app && app.employerId) {
                companyInfo = {
                    companyId: app.employerId._id,
                    companyName: app.employerId.company?.name || app.employerId.name || 'Company',
                    application: app,
                    employerId: app.employerId._id
                };
            }
        }

        if (!companyInfo && companyIdOverride) {
            // Fallback: If company ID provided
            const companyUser = await User.findById(companyIdOverride);
            if (companyUser) {
                companyInfo = {
                    companyId: companyUser._id,
                    companyName: companyUser.company?.name || companyUser.name || 'Company',
                    employerId: companyUser._id
                };
            }
        }

        if (!companyInfo) {
            // Last resort: Try auto-detect (legacy behavior)
            companyInfo = await findJobseekerCompany(jobseekerId);
        }

        if (!companyInfo) {
            // Queue for later if no selected application found
            if (!jobseeker.profile) jobseeker.profile = {};
            jobseeker.profile.assignmentQueue = {
                grade,
                category: null,
                queuedAt: new Date(),
                status: 'pending'
            };
            await jobseeker.save();

            return {
                success: true,
                mentorAssigned: false,
                grade,
                message: "No relevant internship application found to assign a mentor to."
            };
        }

        const targetAppId = applicationIdOverride || companyInfo.application?._id;
        if (!targetAppId) {
            console.warn(`[MentorAllocation] Cannot assign mentor without a specific application ID.`);
            return { success: false, message: "Cannot assign mentor: No application linked." };
        }

        console.log(`[MentorAllocation] Allocating Grade ${grade} mentor for App ${targetAppId} (${companyInfo.companyName})...`);

        // STEP 2: Find best available mentor matching COMPANY + GRADE (Strict Company Match)
        const bestMentor = await findBestMentor(companyInfo.companyId, grade);

        if (!bestMentor) {
            // Queue the jobseeker
            return {
                success: true,
                mentorAssigned: false,
                grade,
                message: `No available Grade ${grade} mentor found in ${companyInfo.companyName}. You are in the waiting queue.`
            };
        }

        // STEP 3: Assign the mentor to the SPECIFIC APPLICATION
        await InternshipApplication.findByIdAndUpdate(targetAppId, { mentorId: bestMentor._id });
        console.log(`[MentorAllocation] Assigned mentor ${bestMentor.name} to App ID: ${targetAppId}`);

        // Update Mentor's mentee count
        if (!bestMentor.mentorProfile) bestMentor.mentorProfile = {};
        bestMentor.mentorProfile.currentMentees = (bestMentor.mentorProfile.currentMentees || 0) + 1;
        await bestMentor.save();

        console.log(`[MentorAllocation] Successfully assigned ${bestMentor.name} (${companyInfo.companyName}) to ${jobseeker.name}`);

        // Send notification emails
        try {
            // Notify jobseeker
            await sendNotificationEmail(
                jobseeker.email,
                'Mentor Assigned - SkillSyncer',
                `
                <h2>Congratulations! 🎉</h2>
                <p>Dear ${jobseeker.name},</p>
                <p>Based on your excellent test performance (Grade ${grade}), you have been assigned a mentor from <strong>${companyInfo.companyName}</strong> for your internship application!</p>
                <p><strong>Your Mentor Details:</strong></p>
                <ul>
                    <li>Name: ${bestMentor.name}</li>
                    <li>Email: ${bestMentor.email}</li>
                    <li>Grade: ${bestMentor.mentorProfile?.grade || grade}</li>
                </ul>
                <p>You can now chat with your mentor directly through the SkillSyncer platform.</p>
                <p>Best regards,<br/>SkillSyncer Team</p>
                `
            );

            // Notify mentor
            await sendNotificationEmail(
                bestMentor.email,
                'New Mentee Assigned - SkillSyncer',
                `
                <h2>New Mentee Assignment 📚</h2>
                <p>Dear ${bestMentor.name},</p>
                <p>A new mentee has been assigned to you!</p>
                <p><strong>Mentee Details:</strong></p>
                <ul>
                    <li>Name: ${jobseeker.name}</li>
                    <li>Email: ${jobseeker.email}</li>
                    <li>Grade: ${grade}</li>
                    <li>Internship: ${companyInfo.application?.internshipDetails?.title || 'Internship'}</li>
                </ul>
                <p>You now have ${bestMentor.mentorProfile.currentMentees} mentee(s).</p>
                <p>You can view and chat with your mentee through the SkillSyncer mentor dashboard.</p>
                <p>Best regards,<br/>SkillSyncer Team</p>
                `
            );
        } catch (emailError) {
            console.error('[MentorAllocation] Error sending notification emails:', emailError);
        }

        return {
            success: true,
            mentorAssigned: true,
            grade,
            mentor: {
                id: bestMentor._id,
                name: bestMentor.name,
                email: bestMentor.email
            },
            message: "Mentor assigned successfully to application."
        };

    } catch (error) {
        console.error("[MentorAllocation] Allocation Error:", error);
        return { success: false, message: "Error during allocation." };
    }
};

/**
 * Get Mentor Status for a Jobseeker
 * Returns comprehensive mentor assignment information
 */
const getMentorStatus = async (userId) => {
    try {
        const user = await User.findById(userId).populate('profile.assignedMentor', 'name email mentorProfile');

        if (!user) {
            return { success: false, message: "User not found." };
        }

        // Logic adjusted: Global Mentor is deprecated. Checking queue only.
        // We may want to query Applications here to see if *any* is active?
        // For now, this just reports on queue or grade status.

        // Check if in queue
        if (user.profile?.assignmentQueue?.status === 'pending') {
            return {
                success: true,
                hasMentor: false, // Per-app check required
                status: "waiting",
                jobseeker: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    profile: user.profile,
                    assignmentQueue: user.profile.assignmentQueue
                },
                message: "You are in the priority queue. A mentor will be assigned soon."
            };
        }

        // Check if user has a grade
        if (user.profile?.grade) {
            return {
                success: true,
                hasMentor: false, // Per-app check required
                status: "waiting",
                jobseeker: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    profile: user.profile
                },
                message: `You have Grade ${user.profile.grade}. Mentor allocation is per-internship.`
            };
        }

        return {
            success: true,
            hasMentor: false,
            status: "not_eligible",
            message: "Complete your profile and pass a test to get assigned a mentor."
        };
    } catch (error) {
        console.error("[MentorAllocation] Status Error:", error);
        return { success: false, message: "Error checking status." };
    }
};

/**
 * Get all mentees for a specific mentor
 */
const getMentorMentees = async (mentorId) => {
    try {
        // Updated to search Internship Applications, not Users
        const applications = await InternshipApplication.find({
            mentorId: mentorId,
            status: { $in: ['selected', 'internship-started', 'completed'] }
        })
            .populate('jobseekerId', 'name email profile.grade')
            .populate('internshipId', 'title');

        const uniqueMentees = applications.map(app => ({
            _id: app.jobseekerId?._id,
            name: app.jobseekerId?.name || 'Unknown',
            email: app.jobseekerId?.email,
            grade: app.jobseekerId?.profile?.grade,
            assignedAt: app.updatedAt,
            internshipTitle: app.internshipDetails?.title || app.internshipId?.title,
            applicationId: app._id
        }));

        return {
            success: true,
            mentees: uniqueMentees
        };
    } catch (error) {
        console.error("[MentorAllocation] Mentees fetch error:", error);
        return { success: false, message: "Error fetching mentees.", mentees: [] };
    }
};

/**
 * Get Mentor Assignment Details for a specific jobseeker
 */
const getMentorAssignment = async (jobseekerId) => {
    // Deprecated global fetch
    return { success: false, message: "Global mentor assignment is deprecated. Check applications." };
};

/**
 * Remove Mentor Assignment (Admin function)
 */
const removeMentorAssignment = async (jobseekerId) => {
    // This previously cleared global profile.assignedMentor.
    // Now it should probably clear mentorId from *all* active applications of this user?
    // Or it remains as a legacy cleanup tool.
    try {
        const jobseeker = await User.findById(jobseekerId);
        if (!jobseeker) return { success: false, message: "Jobseeker not found" };

        if (jobseeker.profile) {
            jobseeker.profile.assignedMentor = null;
            jobseeker.profile.mentorAssignmentDate = null;
            await jobseeker.save();
        }

        return { success: true, message: "Global mentor assignment removed." };
    } catch (error) {
        return { success: false, message: "Error." };
    }
};

/**
 * Manually Assign Mentor (Admin function)
 */
const assignMentor = async (jobseekerId, mentorId) => {
    // This is now ambiguous without an applicationId. 
    // We should probably remove it or update it to require App ID.
    // Leaving as stub or todo.
    return { success: false, message: "Manual assignment requires Application ID now." };
};

/**
 * Process pending assignments in queue (can be called by scheduler)
 */
const processAssignmentQueue = async () => {
    try {
        const pendingUsers = await User.find({
            'profile.assignmentQueue.status': 'pending'
        });

        console.log(`[MentorAllocation] Processing ${pendingUsers.length} pending assignments...`);

        let assigned = 0;
        let failed = 0;

        for (const user of pendingUsers) {
            const grade = user.profile?.assignmentQueue?.grade || user.profile?.grade;
            if (!grade) continue;

            // We need to know WHICH company/app they were queued for.
            // Queue object usually stores category/companyId?
            const companyId = user.profile?.assignmentQueue?.companyId;
            if (!companyId) continue;

            // Re-attempt allocation
            const result = await allocateMentor(user._id, grade, companyId);
            if (result.mentorAssigned) {
                assigned++;
            } else {
                failed++;
            }
        }

        return {
            success: true,
            processed: pendingUsers.length,
            assigned,
            failed
        };
    } catch (error) {
        console.error("[MentorAllocation] Queue processing error:", error);
        return { success: false, message: "Error processing queue." };
    }
};

/**
 * Process all selected jobseekers who don't have mentors yet
 */
const processSelectedJobseekers = async () => {
    try {
        // Find all selected applications with NO mentorId
        const selectedApps = await InternshipApplication.find({
            status: 'selected',
            mentorId: { $exists: false }
        }).populate('jobseekerId');

        let processed = 0;
        let assigned = 0;

        for (const app of selectedApps) {
            const user = app.jobseekerId;
            if (!user) continue;

            const grade = user.profile?.grade;
            if (grade) {
                // Pass the Application ID specifically!
                const result = await allocateMentor(user._id, grade, null, app._id);
                processed++;
                if (result.mentorAssigned) assigned++;
            }
        }

        return { success: true, processed, assigned };
    } catch (error) {
        console.error("[MentorAllocation] Selected processing error:", error);
        return { success: false, message: "Error processing selected jobseekers." };
    }
};

// Export all functions
module.exports = {
    calculateGrade,
    processTestResult,
    allocateMentor,
    getMentorStatus,
    getMentorMentees,
    getMentorAssignment,
    removeMentorAssignment,
    assignMentor,
    findBestMentor,
    findJobseekerCompany,
    processAssignmentQueue,
    processSelectedJobseekers,
    // Legacy stubs for compatibility
    checkAllocationEligibility: async () => false,
    assignMentorToJobSeeker: async () => ({ success: false, message: "Use assignMentor instead" }),
    validateAssignments: async () => ({ success: true }),
    getAssignmentStatistics: async () => ({ success: true }),
    ensureMinimumMentors: async () => ({ success: true })
};

const mongoose = require('mongoose');
const User = require('../models/User');
const InternshipApplication = require('../models/InternshipApplication');
const MentorTask = require('../models/MentorTask');
const MentorSubmission = require('../models/MentorSubmission');
const InternshipPosting = require('../models/InternshipPosting');
require('dotenv').config();

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

const runVerification = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Cleanup old test data
        const emailSuffix = '@verify.test';
        await User.deleteMany({ email: { $regex: emailSuffix } });
        await InternshipPosting.deleteMany({ title: 'Verify Feedback Module' });
        // Clean related apps/tasks/submissions later or let them be orphaned (simpler for script)

        // 2. Create Users
        const mentor = await User.create({
            name: 'Verify Mentor',
            email: `mentor${emailSuffix}`,
            password: 'password123',
            role: 'mentor',
            mentorProfile: { bio: 'Test Mentor', expertise: ['Testing'] }
        });

        const jobseeker = await User.create({
            name: 'Verify Jobseeker',
            email: `jobseeker${emailSuffix}`,
            password: 'password123',
            role: 'jobseeker',
            profile: { skills: ['React'] }
        });

        const employer = await User.create({
            name: 'Verify Employer',
            email: `employer${emailSuffix}`,
            password: 'password123',
            role: 'employer',
            company: { name: 'Test Corp' }
        });

        console.log('Users created');

        // 3. Create Internship Posting
        const posting = await InternshipPosting.create({
            title: 'Verify Feedback Module',
            employerId: employer._id,
            companyName: 'Test Corp',
            description: 'Test Description',
            skillsRequired: ['React'],
            eligibility: 'Freshers',
            industry: 'IT/Technology',
            location: 'Remote',
            mode: 'Online',
            startDate: new Date('2023-01-01'),
            lastDateToApply: new Date('2023-01-15'),
            duration: '3 months',
            totalSeats: 5,
            availableSeats: 5,
            status: 'active'
        });
        console.log('Posting created');

        // 4. Create Application (Completed by Time)
        // Start date 4 months ago, duration 3 months -> Ended 1 month ago.
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 4);

        const app = await InternshipApplication.create({
            internshipId: posting._id,
            jobseekerId: jobseeker._id,
            employerId: employer._id,
            mentorId: mentor._id,
            status: 'active', // Status is active but time is up
            internshipDetails: {
                title: posting.title,
                startDate: startDate,
                duration: '3 months'
            },
            personalDetails: {
                fullName: jobseeker.name,
                emailAddress: jobseeker.email,
                contactNumber: '1234567890',
                dateOfBirth: new Date('2000-01-01'),
                gender: 'Male'
            },
            educationDetails: {
                highestQualification: 'B.Tech',
                institutionName: 'Test Uni',
                yearOfGraduation: 2022,
                cgpaPercentage: '8.5'
            },
            additionalInfo: {
                whyJoinInternship: 'Test',
                resumeUrl: 'http://test.com/resume.pdf'
            },
            declarations: {
                informationTruthful: true,
                consentToShare: true
            }
        });
        console.log('Application created');

        // 5. Create Tasks and Submissions (100% progress)
        const task1 = await MentorTask.create({
            mentorId: mentor._id,
            domain: 'Frontend',
            title: 'Task 1',
            assignedTo: [jobseeker._id]
        });

        const task2 = await MentorTask.create({
            mentorId: mentor._id,
            domain: 'Frontend',
            title: 'Task 2',
            assignedTo: [jobseeker._id]
        });

        await MentorSubmission.create({
            mentorId: mentor._id,
            menteeId: jobseeker._id,
            taskId: task1._id,
            submissionType: 'link',
            link: 'http://test.com',
            viewed: true,
            reviewStatus: 'approved' // assuming approved counts, or just existence counts based on my logic
        });

        await MentorSubmission.create({
            mentorId: mentor._id,
            menteeId: jobseeker._id,
            taskId: task2._id,
            submissionType: 'link',
            link: 'http://test.com',
            viewed: true,
            reviewStatus: 'approved'
        });
        console.log('Tasks and Submissions created');

        // 6. Verify Logic (Copy-Paste from mentor.js effectively)
        console.log('Verifying Logic...');

        const applications = await InternshipApplication.find({
            mentorId: mentor._id,
            status: { $in: ['active', 'completed'] }
        })
            .populate('jobseekerId', 'name email')
            .populate('internshipId', 'title companyName startDate duration');

        const finishedInternships = [];

        for (const a of applications) {
            const sDate = a.internshipDetails?.startDate || a.internshipId.startDate;
            const dur = a.internshipDetails?.duration || a.internshipId.duration;
            const eDate = calculateEndDate(sDate, dur);

            const totalTasks = await MentorTask.countDocuments({
                mentorId: mentor._id,
                assignedTo: a.jobseekerId._id
            });

            let progress = 0;
            let submittedTasks = 0;

            if (totalTasks > 0) {
                const tasks = await MentorTask.find({
                    mentorId: mentor._id,
                    assignedTo: a.jobseekerId._id
                }).select('_id');
                const taskIds = tasks.map(t => t._id);
                submittedTasks = await MentorSubmission.countDocuments({
                    mentorId: mentor._id,
                    menteeId: a.jobseekerId._id,
                    taskId: { $in: taskIds }
                });
                progress = Math.min(100, Math.round((submittedTasks / totalTasks) * 100));
            }

            const isTimeCompleted = eDate && new Date() > eDate;
            const isStatusCompleted = a.status === 'completed';
            const isProgressSufficient = progress >= 90;

            console.log(`App ID: ${a._id}`);
            console.log(`- Time Completed: ${isTimeCompleted} (End Date: ${eDate})`);
            console.log(`- Status Completed: ${isStatusCompleted}`);
            console.log(`- Progress: ${progress}% (${submittedTasks}/${totalTasks})`);

            if ((isTimeCompleted || isStatusCompleted) && isProgressSufficient) {
                finishedInternships.push({
                    jobseekerName: a.jobseekerId.name,
                    progress: progress
                });
            }
        }

        console.log('Finished Internships Found:', finishedInternships);

        if (finishedInternships.length === 1 && finishedInternships[0].jobseekerName === 'Verify Jobseeker') {
            console.log('SUCCESS: Verification Passed!');
        } else {
            console.log('FAILURE: Verification Failed!');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

runVerification();

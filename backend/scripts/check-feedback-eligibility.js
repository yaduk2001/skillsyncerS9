/**
 * Diagnostic script – writes results to a file for easy reading.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGODB_URI;
const OUT_FILE = path.join(__dirname, 'feedback-eligibility-results.txt');
const lines = [];
const log = (...args) => { const msg = args.join(' '); lines.push(msg); console.log(msg); };

function calculateEndDate(startDate, duration) {
    if (!startDate || !duration) return null;
    const start = new Date(startDate);
    const end = new Date(start);
    const m = duration.match(/(\d+)\s*(day|month|year|s)/i);
    if (!m) return null;
    const val = parseInt(m[1]);
    const unit = m[2].toLowerCase();
    if (unit.startsWith('day')) end.setDate(start.getDate() + val);
    else if (unit.startsWith('month')) end.setMonth(start.getMonth() + val);
    else if (unit.startsWith('year')) end.setFullYear(start.getFullYear() + val);
    else return null;
    return end;
}

async function main() {
    await mongoose.connect(MONGO_URI);
    log('Connected to MongoDB');
    log('');

    const db = mongoose.connection.db;
    const appsColl = db.collection('internshipapplications');
    const postingsColl = db.collection('internshippostings');
    const tasksColl = db.collection('mentortasks');
    const subsColl = db.collection('mentorsubmissions');
    const usersColl = db.collection('users');

    log('=== DOCUMENT COUNTS ===');
    log('  internshipapplications: ' + await appsColl.countDocuments());
    log('  internshippostings:     ' + await postingsColl.countDocuments());
    log('  mentortasks:            ' + await tasksColl.countDocuments());
    log('  mentorsubmissions:      ' + await subsColl.countDocuments());
    log('  users:                  ' + await usersColl.countDocuments());
    log('');

    const applications = await appsColl.find({
        mentorId: { $ne: null },
        status: { $in: ['active', 'completed'] }
    }).toArray();

    log('=== APPLICATIONS WITH MENTOR (active/completed): ' + applications.length + ' ===');
    log('');

    const eligible = [];
    const allCandidates = [];

    for (const app of applications) {
        const jobseeker = await usersColl.findOne({ _id: app.jobseekerId }, { projection: { name: 1, email: 1 } });
        if (!jobseeker) continue;

        const posting = app.internshipId ? await postingsColl.findOne({ _id: app.internshipId }, { projection: { title: 1, startDate: 1, duration: 1 } }) : null;

        const startDate = app.internshipDetails?.startDate || posting?.startDate;
        const duration = app.internshipDetails?.duration || posting?.duration;
        const title = app.internshipDetails?.title || posting?.title || 'Unknown';
        const endDate = calculateEndDate(startDate, duration);

        const totalTasks = await tasksColl.countDocuments({ mentorId: app.mentorId, assignedTo: app.jobseekerId });
        let submittedTasks = 0;
        let progress = 0;

        if (totalTasks > 0) {
            const tasks = await tasksColl.find({ mentorId: app.mentorId, assignedTo: app.jobseekerId }, { projection: { _id: 1 } }).toArray();
            const taskIds = tasks.map(t => t._id);
            submittedTasks = await subsColl.countDocuments({ mentorId: app.mentorId, menteeId: app.jobseekerId, taskId: { $in: taskIds } });
            progress = Math.min(100, Math.round((submittedTasks / totalTasks) * 100));
        }

        const isTimeCompleted = endDate && new Date() > endDate;
        const isStatusCompleted = app.status === 'completed';
        const isProgressSufficient = progress >= 90;

        const entry = {
            jobseekerName: jobseeker.name,
            jobseekerEmail: jobseeker.email,
            internshipTitle: title,
            startDate: startDate ? new Date(startDate).toLocaleDateString() : 'N/A',
            endDate: endDate ? endDate.toLocaleDateString() : 'N/A',
            duration: duration || 'N/A',
            status: app.status,
            tasksAssigned: totalTasks,
            tasksSubmitted: submittedTasks,
            progress: progress + '%',
            isTimeCompleted,
            isStatusCompleted,
            isProgressSufficient,
            ELIGIBLE: (isTimeCompleted || isStatusCompleted) && isProgressSufficient
        };

        allCandidates.push(entry);
        if (entry.ELIGIBLE) eligible.push(entry);
    }

    log('=== ALL CANDIDATES ===');
    if (allCandidates.length === 0) {
        log('  (none found - no applications with a mentor in active/completed status)');
    } else {
        allCandidates.forEach((c, i) => {
            log('');
            log('  --- Candidate ' + (i + 1) + ' ---');
            Object.entries(c).forEach(([k, v]) => log('    ' + k + ': ' + v));
        });
    }

    log('');
    log('========================================');
    log('  ELIGIBLE FOR FEEDBACK: ' + eligible.length);
    log('========================================');
    if (eligible.length === 0) {
        log('  No jobseekers currently meet BOTH criteria:');
        log('    1. Internship end date has passed (today or before)');
        log('    2. Submission progress >= 90%');
    } else {
        eligible.forEach((c, i) => {
            log('');
            log('  [OK] ' + c.jobseekerName + ' (' + c.jobseekerEmail + ')');
            log('       Internship: ' + c.internshipTitle);
            log('       Duration: ' + c.startDate + ' -> ' + c.endDate + ' (' + c.duration + ')');
            log('       Tasks: ' + c.tasksSubmitted + '/' + c.tasksAssigned + ' = ' + c.progress);
        });
    }

    log('');
    log('=== DATA SOURCE COLLECTIONS ===');
    log('  1. internshipapplications  - Links jobseeker <-> mentor <-> internship, status, internshipDetails (title, startDate, duration)');
    log('  2. internshippostings      - Original posting with startDate, duration, title (fallback)');
    log('  3. mentortasks             - Tasks assigned by mentor; assignedTo[] has jobseeker IDs => "Tasks Assigned"');
    log('  4. mentorsubmissions       - Submissions by mentees for tasks => "Tasks Submitted"');
    log('  5. users                   - Jobseeker name, email');
    log('');
    log('  FORMULA: progress = (mentorsubmissions count / mentortasks count) * 100');
    log('  CRITERIA: (endDate <= today OR status === "completed") AND progress >= 90%');

    // Write to file
    fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
    log('');
    log('Results saved to: ' + OUT_FILE);

    await mongoose.disconnect();
}

main().catch(err => { console.error('Error:', err); process.exit(1); });

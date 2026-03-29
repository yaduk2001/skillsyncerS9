require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'approved-check.txt');
const lines = [];
const log = (...a) => lines.push(a.join(' '));

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

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const apps = db.collection('internshipapplications');
    const postings = db.collection('internshippostings');
    const tasks = db.collection('mentortasks');
    const subs = db.collection('mentorsubmissions');
    const users = db.collection('users');

    const allApps = await apps.find({ mentorId: { $ne: null }, status: { $in: ['selected', 'active', 'completed'] } }).toArray();
    log('Apps with mentor (selected/active/completed): ' + allApps.length);

    for (const app of allApps) {
        const js = await users.findOne({ _id: app.jobseekerId }, { projection: { name: 1 } });
        const posting = app.internshipId ? await postings.findOne({ _id: app.internshipId }, { projection: { title: 1, startDate: 1, duration: 1 } }) : null;
        const startDate = app.internshipDetails?.startDate || posting?.startDate;
        const duration = app.internshipDetails?.duration || posting?.duration;
        const title = app.internshipDetails?.title || posting?.title || '?';
        const endDate = calculateEndDate(startDate, duration);

        const totalTasks = await tasks.countDocuments({ mentorId: app.mentorId, assignedTo: app.jobseekerId });

        // Count ALL submissions
        let allSubs = 0;
        let approvedSubs = 0;
        if (totalTasks > 0) {
            const tList = await tasks.find({ mentorId: app.mentorId, assignedTo: app.jobseekerId }, { projection: { _id: 1 } }).toArray();
            const taskIds = tList.map(t => t._id);
            allSubs = await subs.countDocuments({ mentorId: app.mentorId, menteeId: app.jobseekerId, taskId: { $in: taskIds } });
            approvedSubs = await subs.countDocuments({ mentorId: app.mentorId, menteeId: app.jobseekerId, taskId: { $in: taskIds }, reviewStatus: 'approved' });
        }

        const progressAll = totalTasks > 0 ? Math.round((allSubs / totalTasks) * 100) : 0;
        const progressApproved = totalTasks > 0 ? Math.round((approvedSubs / totalTasks) * 100) : 0;
        const endPassed = endDate && new Date() > endDate;

        log('');
        log((js?.name || '?') + ' | ' + title + ' | status=' + app.status);
        log('  End: ' + (endDate ? endDate.toLocaleDateString() : 'N/A') + ' | Passed: ' + (endPassed ? 'YES' : 'NO'));
        log('  Total tasks: ' + totalTasks);
        log('  All submissions: ' + allSubs + ' (' + progressAll + '%)');
        log('  Approved only:   ' + approvedSubs + ' (' + progressApproved + '%)');
        log('  Eligible (approved >= 90% && end passed)? ' + ((endPassed && progressApproved >= 90) ? 'YES' : 'NO'));

        // Show reviewStatus of each submission
        if (totalTasks > 0) {
            const tList = await tasks.find({ mentorId: app.mentorId, assignedTo: app.jobseekerId }, { projection: { _id: 1 } }).toArray();
            const taskIds = tList.map(t => t._id);
            const submissions = await subs.find({ mentorId: app.mentorId, menteeId: app.jobseekerId, taskId: { $in: taskIds } }, { projection: { reviewStatus: 1 } }).toArray();
            const statusCounts = {};
            submissions.forEach(s => { statusCounts[s.reviewStatus] = (statusCounts[s.reviewStatus] || 0) + 1; });
            log('  Submission statuses: ' + JSON.stringify(statusCounts));
        }
    }

    fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
    console.log('Written to: ' + OUT);
    await mongoose.disconnect();
})();

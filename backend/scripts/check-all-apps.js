require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'all-apps-enddate-check.txt');
const lines = [];
const log = (...a) => { const m = a.join(' '); lines.push(m); };

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

    const now = new Date();
    log('Current date: ' + now.toLocaleDateString());
    log('');

    // Get ALL applications (any status) that have a mentorId
    const allApps = await apps.find({ mentorId: { $ne: null } }).toArray();
    log('Total applications with mentorId: ' + allApps.length);
    log('');

    for (const app of allApps) {
        const js = await users.findOne({ _id: app.jobseekerId }, { projection: { name: 1, email: 1 } });
        const posting = app.internshipId ? await postings.findOne({ _id: app.internshipId }, { projection: { title: 1, startDate: 1, duration: 1 } }) : null;

        const startDate = app.internshipDetails?.startDate || posting?.startDate;
        const duration = app.internshipDetails?.duration || posting?.duration;
        const title = app.internshipDetails?.title || posting?.title || 'Unknown';
        const endDate = calculateEndDate(startDate, duration);

        const totalTasks = await tasks.countDocuments({ mentorId: app.mentorId, assignedTo: app.jobseekerId });
        let submittedTasks = 0, progress = 0;
        if (totalTasks > 0) {
            const tList = await tasks.find({ mentorId: app.mentorId, assignedTo: app.jobseekerId }, { projection: { _id: 1 } }).toArray();
            submittedTasks = await subs.countDocuments({ mentorId: app.mentorId, menteeId: app.jobseekerId, taskId: { $in: tList.map(t => t._id) } });
            progress = Math.min(100, Math.round((submittedTasks / totalTasks) * 100));
        }

        const endPassed = endDate && now > endDate;

        log('--- ' + (js?.name || 'Unknown') + ' (' + (js?.email || '?') + ') ---');
        log('  Internship: ' + title);
        log('  Status: ' + app.status);
        log('  Start: ' + (startDate ? new Date(startDate).toLocaleDateString() : 'N/A'));
        log('  End:   ' + (endDate ? endDate.toLocaleDateString() : 'N/A'));
        log('  Duration: ' + (duration || 'N/A'));
        log('  End date passed? ' + (endPassed ? 'YES' : 'NO'));
        log('  Tasks: ' + submittedTasks + '/' + totalTasks + ' = ' + progress + '%');
        log('  Progress >= 90%? ' + (progress >= 90 ? 'YES' : 'NO'));
        log('  >> ELIGIBLE? ' + ((endPassed && progress >= 90) ? 'YES' : 'NO - ' + (!endPassed ? 'end date not passed' : 'progress < 90%')));
        log('');
    }

    // Also check ALL apps (even without mentor) to see end dates
    log('=== ALL 52 APPLICATIONS END DATE CHECK ===');
    const everyApp = await apps.find({}).toArray();
    let passedCount = 0;
    for (const app of everyApp) {
        const posting = app.internshipId ? await postings.findOne({ _id: app.internshipId }, { projection: { title: 1, startDate: 1, duration: 1 } }) : null;
        const startDate = app.internshipDetails?.startDate || posting?.startDate;
        const duration = app.internshipDetails?.duration || posting?.duration;
        const endDate = calculateEndDate(startDate, duration);
        const endPassed = endDate && now > endDate;
        if (endPassed) passedCount++;
        const js = await users.findOne({ _id: app.jobseekerId }, { projection: { name: 1 } });
        log('  ' + (js?.name || '?') + ' | status=' + app.status + ' | mentor=' + (app.mentorId ? 'yes' : 'no') + ' | end=' + (endDate ? endDate.toLocaleDateString() : 'N/A') + ' | passed=' + (endPassed ? 'YES' : 'no'));
    }
    log('');
    log('Total with end date passed: ' + passedCount + ' / ' + everyApp.length);

    fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
    console.log('Results written to: ' + OUT);
    await mongoose.disconnect();
})();

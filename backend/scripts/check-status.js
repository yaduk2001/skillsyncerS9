require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const apps = db.collection('internshipapplications');

    // Status distribution
    const statusCounts = await apps.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray();
    console.log('STATUS DISTRIBUTION:');
    statusCounts.forEach(s => console.log('  ' + s._id + ': ' + s.count));

    // With mentor
    const withMentor = await apps.countDocuments({ mentorId: { $ne: null } });
    console.log('\nWith mentorId assigned: ' + withMentor);

    // With mentor by status
    const withMentorByStatus = await apps.aggregate([
        { $match: { mentorId: { $ne: null } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.log('With mentor by status:');
    withMentorByStatus.forEach(s => console.log('  ' + s._id + ': ' + s.count));

    // Show a sample app with a mentor
    const sampleWithMentor = await apps.findOne({ mentorId: { $ne: null } });
    if (sampleWithMentor) {
        console.log('\nSample app with mentor:');
        console.log('  _id:', sampleWithMentor._id.toString());
        console.log('  status:', sampleWithMentor.status);
        console.log('  mentorId:', sampleWithMentor.mentorId.toString());
        console.log('  jobseekerId:', sampleWithMentor.jobseekerId.toString());
        console.log('  internshipDetails:', JSON.stringify(sampleWithMentor.internshipDetails));
    } else {
        console.log('\nNo applications found with a mentorId at all.');
    }

    // Check mentortasks - who are mentors?
    const mentorTasks = db.collection('mentortasks');
    const mentorIds = await mentorTasks.distinct('mentorId');
    console.log('\nMentor IDs in mentortasks:', mentorIds.map(id => id.toString()));

    const assignedTo = await mentorTasks.distinct('assignedTo');
    console.log('AssignedTo user IDs in mentortasks:', assignedTo.map(id => id.toString()));

    await mongoose.disconnect();
})();

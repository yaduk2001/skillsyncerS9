const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MentorSubmission = require('../models/MentorSubmission');
const MentorTask = require('../models/MentorTask');
const User = require('../models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    console.log('✅ MongoDB connected\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const debugSubmissionHistory = async () => {
  await connectDB();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 SUBMISSION HISTORY DEBUG REPORT');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Get all submissions
  const allSubmissions = await MentorSubmission.find({})
    .populate('menteeId', 'name email')
    .populate('mentorId', 'name')
    .sort({ createdAt: -1 })
    .lean();
  
  console.log(`📊 Total submissions in database: ${allSubmissions.length}\n`);
  
  if (allSubmissions.length === 0) {
    console.log('⚠️  No submissions found in database!');
    process.exit(0);
  }
  
  // Check version numbers
  const withVersion = allSubmissions.filter(s => s.submissionVersion);
  const withoutVersion = allSubmissions.filter(s => !s.submissionVersion);
  
  console.log(`✅ Submissions WITH version: ${withVersion.length}`);
  console.log(`❌ Submissions WITHOUT version: ${withoutVersion.length}\n`);
  
  // Group by task and mentee
  const grouped = {};
  for (const sub of allSubmissions) {
    const key = `${sub.taskId}_${sub.menteeId?._id || sub.menteeId}`;
    if (!grouped[key]) {
      grouped[key] = {
        taskId: sub.taskId,
        menteeId: sub.menteeId,
        taskTitle: sub.title,
        submissions: []
      };
    }
    grouped[key].submissions.push(sub);
  }
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('📦 GROUPED SUBMISSIONS BY TASK & MENTEE');
  console.log('═══════════════════════════════════════════════════════\n');
  
  let groupIndex = 1;
  for (const [key, group] of Object.entries(grouped)) {
    const menteeName = group.menteeId?.name || 'Unknown';
    const taskTitle = group.taskTitle || 'Untitled Task';
    
    console.log(`\n${groupIndex}. Task: "${taskTitle}"`);
    console.log(`   Mentee: ${menteeName}`);
    console.log(`   Total Submissions: ${group.submissions.length}`);
    
    if (group.submissions.length > 1) {
      console.log(`   ⚠️  MULTIPLE SUBMISSIONS FOUND (should show in history!):`);
    }
    
    group.submissions.forEach((sub, idx) => {
      console.log(`\n   Submission #${idx + 1}:`);
      console.log(`     - ID: ${sub._id}`);
      console.log(`     - Version: ${sub.submissionVersion || 'MISSING'}`);
      console.log(`     - Status: ${sub.reviewStatus || 'pending'}`);
      console.log(`     - Created: ${new Date(sub.createdAt).toLocaleString()}`);
      console.log(`     - Previous ID: ${sub.previousSubmissionId || 'none'}`);
      console.log(`     - Type: ${sub.submissionType}`);
      console.log(`     - Has Files: ${sub.files?.length > 0 ? 'Yes' : 'No'}`);
      console.log(`     - Has Link: ${sub.link ? 'Yes' : 'No'}`);
    });
    
    groupIndex++;
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔍 TEST HISTORY QUERY');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Test the history query for the first submission with multiple versions
  const multiVersionGroup = Object.values(grouped).find(g => g.submissions.length > 1);
  
  if (multiVersionGroup) {
    const testSubmission = multiVersionGroup.submissions[0];
    console.log(`Testing history query for submission: ${testSubmission._id}`);
    console.log(`Task: ${testSubmission.title}`);
    
    const historyResults = await MentorSubmission.find({
      taskId: testSubmission.taskId,
      menteeId: testSubmission.menteeId?._id || testSubmission.menteeId
    }).sort({ submissionVersion: 1 }).lean();
    
    console.log(`\n✅ History query returned ${historyResults.length} submission(s):`);
    historyResults.forEach((sub, idx) => {
      console.log(`  ${idx + 1}. v${sub.submissionVersion || '?'} - ${sub._id} - ${sub.reviewStatus || 'pending'}`);
    });
  } else {
    console.log('⚠️  No submissions with multiple versions found for testing.');
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('💡 RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (withoutVersion.length > 0) {
    console.log('❌ ACTION REQUIRED: Run the migration script:');
    console.log('   node scripts/fix_submission_versions.js\n');
  } else {
    console.log('✅ All submissions have version numbers!\n');
  }
  
  if (Object.values(grouped).some(g => g.submissions.length > 1)) {
    console.log('✅ Multiple submissions detected - history should work!');
  } else {
    console.log('⚠️  No tasks with multiple submissions found.');
    console.log('   To test history, submit a task, get it rejected, and resubmit.\n');
  }
  
  process.exit(0);
};

debugSubmissionHistory().catch(error => {
  console.error('❌ Debug script failed:', error);
  process.exit(1);
});

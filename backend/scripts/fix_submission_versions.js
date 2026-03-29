const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MentorSubmission = require('../models/MentorSubmission');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixSubmissionVersions = async () => {
  await connectDB();
  
  console.log('🔍 Finding submissions without version numbers...');
  
  // Find all submissions without submissionVersion
  const submissionsWithoutVersion = await MentorSubmission.find({
    $or: [
      { submissionVersion: { $exists: false } },
      { submissionVersion: null }
    ]
  }).lean();
  
  console.log(`📊 Found ${submissionsWithoutVersion.length} submissions without version numbers`);
  
  if (submissionsWithoutVersion.length === 0) {
    console.log('✨ All submissions already have version numbers!');
    process.exit(0);
  }
  
  // Group by taskId and menteeId
  const groupedSubmissions = {};
  
  for (const sub of submissionsWithoutVersion) {
    const key = `${sub.taskId}_${sub.menteeId}`;
    if (!groupedSubmissions[key]) {
      groupedSubmissions[key] = [];
    }
    groupedSubmissions[key].push(sub);
  }
  
  console.log(`📦 Grouped into ${Object.keys(groupedSubmissions).length} unique task-mentee combinations`);
  
  let updatedCount = 0;
  
  // For each group, assign version numbers based on creation time
  for (const [key, subs] of Object.entries(groupedSubmissions)) {
    // Sort by creation date (oldest first)
    subs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Assign version numbers
    for (let i = 0; i < subs.length; i++) {
      const version = i + 1;
      const previousId = i > 0 ? subs[i - 1]._id : null;
      
      await MentorSubmission.updateOne(
        { _id: subs[i]._id },
        { 
          $set: { 
            submissionVersion: version,
            previousSubmissionId: previousId
          } 
        }
      );
      
      updatedCount++;
      console.log(`  ✓ Updated submission ${subs[i]._id} → v${version}`);
    }
  }
  
  console.log(`\n✅ Successfully updated ${updatedCount} submissions with version numbers!`);
  console.log('🎉 Migration complete!');
  
  process.exit(0);
};

fixSubmissionVersions().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

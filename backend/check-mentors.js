const mongoose = require('mongoose');
require('dotenv').config(); // Load env variables
const User = require('./models/User');

// Script to check existing mentors and their grades
async function checkMentors() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsyncer');
    console.log('Connected to database');

    // Find all mentors
    const mentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      isActive: true
    }).select('name email mentorProfile.grade mentorProfile.categories company.name');

    console.log('\n=== All Active Mentors ===');
    if (mentors.length === 0) {
      console.log('❌ No active mentors found in database');
      console.log('\nTo create mentors:');
      console.log('1. Use the admin panel to add mentors manually');
      console.log('2. Or approve mentor requests from companies');
      console.log('3. Then assign grades A and B to mentors using the admin panel');
      return;
    }

    const gradeA = mentors.filter(m => m.mentorProfile?.grade === 'A');
    const gradeB = mentors.filter(m => m.mentorProfile?.grade === 'B');
    const noGrade = mentors.filter(m => !m.mentorProfile?.grade);

    console.log(`\n📊 Summary:`);
    console.log(`   Total mentors: ${mentors.length}`);
    console.log(`   Grade A: ${gradeA.length}`);
    console.log(`   Grade B: ${gradeB.length}`);
    console.log(`   No grade: ${noGrade.length}`);

    console.log('\n=== Grade A Mentors ===');
    if (gradeA.length === 0) {
      console.log('❌ No Grade A mentors found');
    } else {
      gradeA.forEach(mentor => {
        console.log(`✅ ${mentor.name} (${mentor.email})`);
        console.log(`   Categories: ${mentor.mentorProfile?.categories?.join(', ') || 'None'}`);
        console.log(`   Company: ${mentor.company?.name || 'None'}`);
      });
    }

    console.log('\n=== Grade B Mentors ===');
    if (gradeB.length === 0) {
      console.log('❌ No Grade B mentors found');
    } else {
      gradeB.forEach(mentor => {
        console.log(`✅ ${mentor.name} (${mentor.email})`);
        console.log(`   Categories: ${mentor.mentorProfile?.categories?.join(', ') || 'None'}`);
        console.log(`   Company: ${mentor.company?.name || 'None'}`);
      });
    }

    console.log('\n=== Mentors Without Grade ===');
    if (noGrade.length === 0) {
      console.log('✅ All mentors have grades assigned');
    } else {
      console.log('⚠️  These mentors need grades assigned:');
      noGrade.forEach(mentor => {
        console.log(`   ${mentor.name} (${mentor.email})`);
        console.log(`   Categories: ${mentor.mentorProfile?.categories?.join(', ') || 'None'}`);
        console.log(`   Company: ${mentor.company?.name || 'None'}`);
      });
      console.log('\nTo assign grades:');
      console.log('1. Use the admin panel to set grades A and B for mentors');
      console.log('2. Or use the API: POST /api/admin/mentors/set-grades');
    }

    // Check categories
    const allCategories = new Set();
    mentors.forEach(mentor => {
      if (mentor.mentorProfile?.categories) {
        mentor.mentorProfile.categories.forEach(cat => allCategories.add(cat));
      }
    });

    console.log('\n=== Categories Coverage ===');
    if (allCategories.size === 0) {
      console.log('❌ No categories found in mentor profiles');
    } else {
      console.log('Available categories:');
      Array.from(allCategories).forEach(category => {
        const categoryMentors = mentors.filter(m =>
          m.mentorProfile?.categories?.includes(category)
        );
        const gradeAMentors = categoryMentors.filter(m => m.mentorProfile?.grade === 'A');
        const gradeBMentors = categoryMentors.filter(m => m.mentorProfile?.grade === 'B');

        console.log(`   ${category}: ${categoryMentors.length} mentors (A: ${gradeAMentors.length}, B: ${gradeBMentors.length})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the check
checkMentors();

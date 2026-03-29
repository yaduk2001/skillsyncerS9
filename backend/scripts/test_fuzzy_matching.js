const { computeMatchScore } = require('../utils/matching');

function runTest() {
    console.log('Testing Fuzzy Skill Matching...');

    // Case 1: Substring match check
    // Job requires "React", User has "React Native" -> Should Match
    const criteria1 = {
        skills: ['react'],
        certifications: [],
        domain: 'tech',
        qualifications: []
    };
    const applicant1 = {
        skills: ['react native', 'javascript'],
        certifications: [],
        domain: 'tech',
        educationStrings: [],
        contactInfo: { email: 'test@test.com', linkedin: 'linkedin.com/in/test', github: 'github.com/test', contactNumber: '1234567890' }
    };

    const score1 = computeMatchScore(criteria1, applicant1);
    const matchedSkills1 = score1.matched.filter(m => m.startsWith('skill:'));
    console.log('Case 1 (React vs React Native):');
    console.log('  Matched Skills:', matchedSkills1);
    console.log('  Score:', score1.score);
    console.log('  Expected: Match found for react');

    // Case 2: Reverse Substring
    // Job requires "Node.js", User has "Node" -> Should Match
    const criteria2 = {
        skills: ['node.js'],
        certifications: [],
        domain: 'tech',
        qualifications: []
    };
    const applicant2 = {
        skills: ['node', 'express'],
        certifications: [],
        domain: 'tech',
        educationStrings: [],
        contactInfo: { email: 'test@test.com', linkedin: 'linkedin.com/in/test', github: 'github.com/test', contactNumber: '1234567890' }
    };

    const score2 = computeMatchScore(criteria2, applicant2);
    const matchedSkills2 = score2.matched.filter(m => m.startsWith('skill:'));
    console.log('\nCase 2 (Node.js vs Node):');
    console.log('  Matched Skills:', matchedSkills2);
    console.log('  Score:', score2.score);
    console.log('  Expected: Match found for node.js');

    // Case 3: No Match
    const criteria3 = {
        skills: ['java'],
        certifications: [],
        domain: 'tech',
        qualifications: []
    };
    const applicant3 = {
        skills: ['javascript', 'python'], // Javascript contains java string, so this MIGHT match loosely if logic is just includes.
        // NOTE: "javascript".includes("java") is true.
        // This is a side effect of naive substring matching. Is this desired?
        // "Java" != "Javascript".
        // Better logic might be word boundary, but user asked for "keyword match".
        // For now, let's see if it matches.
        certifications: [],
        domain: 'tech',
        educationStrings: [],
        contactInfo: { email: 'test@test.com', linkedin: 'linkedin.com/in/test', github: 'github.com/test', contactNumber: '1234567890' }
    };

    const score3 = computeMatchScore(criteria3, applicant3);
    const matchedSkills3 = score3.matched.filter(m => m.startsWith('skill:'));
    console.log('\nCase 3 (Java vs Javascript):');
    console.log('  Matched Skills:', matchedSkills3);
    console.log('  Note: "javascript".includes("java") is true, so this strictly is a match with current logic.');

}

runTest();

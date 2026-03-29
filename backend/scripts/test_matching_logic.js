const { computeMatchScore } = require('../utils/matching');

function runTest() {
    console.log('Testing Matching Logic...');

    // Case 1: Perfect match
    const criteria1 = {
        skills: ['javascript', 'node'],
        certifications: ['aws certified'],
        domain: 'tech',
        qualifications: ['bachelor']
    };
    const applicant1 = {
        skills: ['javascript', 'node'],
        certifications: ['aws certified'],
        domain: 'tech',
        educationStrings: ['bachelor of engineering'],
        contactInfo: { email: 'test@test.com', linkedin: 'linkedin.com/in/test', github: 'github.com/test', contactNumber: '1234567890' }
    };

    const score1 = computeMatchScore(criteria1, applicant1);
    console.log('Case 1 (Perfect):', score1.score, '(Expected: 100)');

    // Case 2: Only Skills Match (50% max)
    const applicant2 = {
        skills: ['javascript', 'node'],
        certifications: [],
        domain: 'other',
        educationStrings: [],
        contactInfo: {}
    };
    const score2 = computeMatchScore(criteria1, applicant2);
    console.log('Case 2 (Skills Only):', score2.score, '(Expected: 50)');

    // Case 3: Only Cert Match (10% max)
    const applicant3 = {
        skills: [],
        certifications: ['aws certified'],
        domain: 'other',
        educationStrings: [],
        contactInfo: {}
    };
    const score3 = computeMatchScore(criteria1, applicant3);
    console.log('Case 3 (Certs Only):', score3.score, '(Expected: 10)');

    // Case 4: No certs required in criteria
    const criteriaNoCert = {
        skills: ['javascript'],
        certifications: [],
        domain: 'other'
    };
    const applicantNoCert = {
        skills: ['javascript'],
        certifications: [],
        domain: 'other',
        educationStrings: [],
        contactInfo: {}
    };
    // Skills (1/1) * 0.5 = 50. Certs (0/0 -> 1) * 0.1 = 10. Domain (1) * 0.2 = 20. Total 80.
    const score4 = computeMatchScore(criteriaNoCert, applicantNoCert);
    console.log('Case 4 (No Certs Required, Skills+Domain Match):', score4.score, '(Expected: 80)');

}

runTest();

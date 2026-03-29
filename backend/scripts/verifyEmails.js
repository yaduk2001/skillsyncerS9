const {
    sendEmployeeCredentials,
    sendRequestRejectionEmail,
    sendMentorCredentials
} = require('../utils/emailService');

require('dotenv').config({ path: './backend/.env' });

const testEmail = process.argv[2] || 'test@example.com';

async function runTests() {
    console.log(`Running Email Verification Tests for: ${testEmail}\n`);

    // 1. Test Employee Credentials Email
    console.log('--- Test 1: Employee Credentials Email ---');
    const empResult = await sendEmployeeCredentials(
        testEmail,
        'John Doe',
        'tempPass123',
        'Acme Corp'
    );
    console.log('Result:', empResult);
    console.log('\n');

    // 2. Test Employee Rejection Email
    console.log('--- Test 2: Employee Rejection Email ---');
    const empRejResult = await sendRequestRejectionEmail(
        testEmail,
        'Jane Doe',
        'Employee',
        'Acme Corp',
        'Position filled internally.'
    );
    console.log('Result:', empRejResult);
    console.log('\n');

    // 3. Test Mentor Rejection Email
    console.log('--- Test 3: Mentor Rejection Email ---');
    const mentorRejResult = await sendRequestRejectionEmail(
        testEmail,
        'Tech Solutions Inc.',
        'Mentor',
        'SkillSyncer',
        'Not enough experience listed.'
    );
    console.log('Result:', mentorRejResult);
    console.log('\n');
}

runTests().catch(console.error);

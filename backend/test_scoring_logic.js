require('dotenv').config();
const { scoreAnswers } = require('./utils/gemini');
const fs = require('fs');

const run = async () => {
    try {
        console.log("Loading latest test data...");
        const testData = JSON.parse(fs.readFileSync('latest_test.json', 'utf8'));

        const questions = testData.questions;
        const answers = testData.answers;

        console.log(`Testing scoring for ${questions.length} questions...`);
        console.log("API Key present:", !!process.env.GEMINI_API_KEY);

        const result = await scoreAnswers(questions, answers);

        console.log("\n--- SCORING RESULT ---");
        console.log(JSON.stringify(result, null, 2));

    } catch (e) {
        console.error("Test failed:", e);
    }
};
run();

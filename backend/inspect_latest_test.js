require('dotenv').config();
const mongoose = require('mongoose');
const Test = require('./models/Test');

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(uri);

        // Find the most recent test
        const test = await Test.findOne().sort({ updatedAt: -1 });

        if (test) {
            console.log("=== LATEST TEST DATA ===");
            console.log("ID:", test._id);
            console.log("Result:", test.result);
            console.log("Score:", test.score);
            console.log("Question Count:", test.questions ? test.questions.length : 0);

            if (test.questions && test.questions.length > 0) {
                console.log("\n--- QUESTIONS DUMP ---");
                test.questions.forEach((q, i) => {
                    console.log(`\n[Question ${i + 1}] Type: ${q.type}`);
                    console.log(`Q: ${q.question}`);
                    if (q.starterCode) console.log(`StarterCode: ${q.starterCode}`);
                    console.log(`Answer Key: ${q.answerKey}`);
                });
            }

            if (test.answers) {
                console.log("\n--- USER ANSWERS ---");
                test.answers.forEach((ans, i) => {
                    console.log(`[Q${i + 1} Ans]: ${ans}`);
                });
            }

            if (test.correctness) {
                console.log("\n--- CORRECTNESS ---");
                console.log(test.correctness);
            }

        } else {
            console.log("No test found.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};
run();

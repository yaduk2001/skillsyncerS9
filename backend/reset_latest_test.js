require('dotenv').config();
const mongoose = require('mongoose');
const Test = require('./models/Test');

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            console.error("❌ MONGODB_URI not found in environment variables.");
            return;
        }
        await mongoose.connect(uri);
        const test = await Test.findOne().sort({ updatedAt: -1 });
        if (test) {
            console.log(`Found test: ${test._id}`);
            console.log(`Current State - SubmittedAt: ${test.submittedAt}`);

            // Reset fields
            test.submittedAt = null;
            // Reset expiry to 24 hours from now
            test.testExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
            test.score = null;
            test.result = null;
            test.answers = [];

            await test.save();
            console.log("✅ Test has been reset successfully. You can now re-submit.");
        } else {
            console.log("❌ No test found to reset.");
        }
    } catch (e) {
        console.error("Error resetting test:", e);
    } finally {
        await mongoose.disconnect();
    }
};
run();

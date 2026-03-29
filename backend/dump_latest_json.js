require('dotenv').config();
const mongoose = require('mongoose');
const Test = require('./models/Test');
const fs = require('fs');

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(uri);
        const test = await Test.findOne().sort({ updatedAt: -1 });
        if (test) {
            fs.writeFileSync('latest_test.json', JSON.stringify(test, null, 2));
            console.log("Saved to latest_test.json");
        } else {
            console.log("No test found");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};
run();

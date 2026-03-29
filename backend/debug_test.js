require('dotenv').config();
const mongoose = require('mongoose');
const Test = require('./models/Test');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const test = await Test.findOne().sort({ updatedAt: -1 });
        if (test) {
            console.log(JSON.stringify(test.toObject(), null, 2));
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

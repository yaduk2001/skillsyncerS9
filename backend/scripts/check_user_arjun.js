const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const user = await User.findOne({ name: 'Arjun' });
        let output = '';
        if (user) {
            output += `User found: ${user.name}\n`;
            output += `User.profile.skills: ${JSON.stringify(user.profile?.skills)}\n`;
            output += `User.profile.education: ${JSON.stringify(user.profile?.education)}\n`;
            output += `User.profile.certifications: ${JSON.stringify(user.profile?.certifications)}\n`;
        } else {
            output += 'User Arjun not found\n';
        }
        fs.writeFileSync('arjun_data.txt', output);
        console.log('Written to arjun_data.txt');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();

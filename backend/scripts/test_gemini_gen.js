// Native fetch (Node 18+)
// const fetch = require('node-fetch'); 
const fs = require('fs');
require('dotenv').config();
const { generateTestQuestions } = require('../utils/gemini');

// Hook console.log/error to file
const logStream = fs.createWriteStream('debug_log.txt', { flags: 'w' });
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    logStream.write(msg + '\n');
    originalLog.apply(console, args);
};
console.error = function(...args) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    logStream.write('[ERROR] ' + msg + '\n');
    originalError.apply(console, args);
};

async function test() {
    console.log("Testing Gemini Generation...");
    try {
        const questions = await generateTestQuestions("React Developer Internship", ["React", "JavaScript", "CSS"]);
        console.log("Result Length:", questions.length);
        console.log("Result:", JSON.stringify(questions, null, 2));
    } catch (e) {
        console.error("Test Script Error:", e);
    }
    logStream.end();
}

test();

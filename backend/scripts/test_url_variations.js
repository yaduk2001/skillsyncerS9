const fetch = require('node-fetch'); // or native
require('dotenv').config();

const KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-flash";

async function testUrl(urlDesc, url) {
    console.log(`Testing ${urlDesc}: ${url.replace(KEY, 'MASKED')}`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });
        const text = await response.text();
        console.log(`Status: ${response.status}`);
        if (response.ok) {
            console.log("SUCCESS! Body snippet:", text.substring(0, 100));
            return true;
        } else {
            console.log("Failed. Body snippet:", text.substring(0, 100));
            return false;
        }
    } catch (e) {
        console.error("Exception:", e.message);
        return false;
    }
}

async function run() {
    const urls = [
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
        `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${KEY}`,
        `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${KEY}`,
        // Try gemini-pro on v1
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${KEY}`
    ];

    for (const url of urls) {
        if (await testUrl("URL Variation", url)) break;
    }
}

run();

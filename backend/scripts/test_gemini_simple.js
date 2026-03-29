// Native fetch
require('dotenv').config();

async function test() {
    const key = process.env.GEMINI_API_KEY || '';
    // List models endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    console.log("Listing Models via Fetch:", url.replace(key, 'MASKED'));

    try {
        const response = await fetch(url);
        console.log("Status:", response.status);
        const json = await response.json();
        if (json.models) {
            console.log("Available Models:", json.models.map(m => m.name));
        } else {
            console.log("No models found or error:", json);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

test();

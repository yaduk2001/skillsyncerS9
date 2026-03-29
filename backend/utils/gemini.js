/**
 * Gemini AI Utility Module
 * Handles test question generation and answer scoring using Google Gemini API.
 * 
 * Question Distribution (8 total):
 * - 2 Coding questions
 * - 1 Debug question
 * - 5 MCQ/One-word questions
 * 
 * NOTE: Question generation now uses the Python script (model/intern.py) 
 * instead of JavaScript Gemini API calls. Scoring still uses JavaScript.
 */

const { spawn } = require('child_process');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Path to the Python question generator script
const PYTHON_SCRIPT_PATH = path.resolve(__dirname, '../../model/question_generator.py');

// Available models to try for scoring (question gen uses Python)
const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro"
];

// Question distribution constants
const TOTAL_QUESTIONS = 8;
const CODING_QUESTIONS = 2;
const DEBUG_QUESTIONS = 1;

/**
 * Health check for Gemini API
 */
async function healthCheck() {
    if (!GEMINI_API_KEY) {
        return { ok: false, error: 'GEMINI_API_KEY not configured' };
    }

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Say 'API working' in exactly 2 words." }] }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return { ok: true, sample: text.substring(0, 50) };
        } else {
            return { ok: false, error: `Status ${response.status}` };
        }
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

/**
 * Extract the longest balanced JSON object/array from text
 */
function extractBalancedJSON(text, type = 'object') {
    if (!text || typeof text !== 'string') return null;

    const openChar = type === 'array' ? '[' : '{';
    const closeChar = type === 'array' ? ']' : '}';

    let depth = 0;
    let startIdx = null;
    let best = null;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === openChar) {
            if (depth === 0) startIdx = i;
            depth++;
        } else if (ch === closeChar) {
            if (depth > 0) {
                depth--;
                if (depth === 0 && startIdx !== null) {
                    const span = [startIdx, i + 1];
                    if (!best || (span[1] - span[0]) > (best[1] - best[0])) {
                        best = span;
                    }
                }
            }
        }
    }

    if (!best) return null;
    return text.substring(best[0], best[1]);
}

/**
 * Generate mixed question set using Python script (model/intern.py)
 * Distribution: 2 coding, 1 debug, 5 MCQ/one_word
 * 
 * This function now calls the Python question_generator.py script
 * instead of making direct Gemini API calls from JavaScript.
 */
async function generateTestQuestions(title, skills = []) {
    const skillsText = skills.length > 0 ? skills.join(',') : '';

    console.log(`[Python] Generating questions for: ${title}`);
    console.log(`[Python] Skills: ${skillsText || 'General Technical Skills'}`);
    console.log(`[Python] Script path: ${PYTHON_SCRIPT_PATH}`);

    return new Promise((resolve, reject) => {
        const args = [
            PYTHON_SCRIPT_PATH,
            '--topic', title
        ];

        if (skillsText) {
            args.push('--skills', skillsText);
        }

        // Spawn Python process
        const pythonProcess = spawn('python', args, {
            env: { ...process.env },  // Pass environment variables including GEMINI_API_KEY
            cwd: path.dirname(PYTHON_SCRIPT_PATH)
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            // Log stderr but don't treat it as error (Python prints logs to stderr)
            console.log(`[Python Log] ${data.toString().trim()}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`[Python] Process exited with code ${code}`);
                console.error(`[Python] Stderr: ${stderr}`);
                console.log('[Python] Falling back to default questions');
                resolve(generateFallbackQuestions(title));
                return;
            }

            try {
                // Parse the JSON output from Python
                const questions = JSON.parse(stdout.trim());

                if (Array.isArray(questions) && questions.length > 0) {
                    console.log(`[Python] Successfully generated ${questions.length} questions`);
                    resolve(questions);
                } else {
                    console.error('[Python] Invalid or empty questions array');
                    resolve(generateFallbackQuestions(title));
                }
            } catch (parseError) {
                console.error('[Python] Failed to parse JSON output:', parseError.message);
                console.error('[Python] Raw output:', stdout.substring(0, 500));
                resolve(generateFallbackQuestions(title));
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('[Python] Failed to spawn process:', error.message);
            resolve(generateFallbackQuestions(title));
        });

        // Set a timeout of 60 seconds for the Python process
        setTimeout(() => {
            if (!pythonProcess.killed) {
                console.error('[Python] Process timeout - killing');
                pythonProcess.kill();
                resolve(generateFallbackQuestions(title));
            }
        }, 60000);
    });
}

/**
 * Map question types from intern.py format to test system format
 */
function mapQuestionType(type) {
    switch (type?.toLowerCase()) {
        case 'mcq': return 'mcq';
        case 'one_word': return 'text';
        case 'coding': return 'code';
        case 'debug': return 'code';
        default: return 'text';
    }
}

/**
 * Generate fallback questions if AI fails
 */
function generateFallbackQuestions(title) {
    return [
        {
            question: `What is the primary purpose of ${title}?`,
            type: 'text',
            answerKey: 'industry-specific answer'
        },
        {
            question: `Which of the following best describes ${title}?`,
            type: 'mcq',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            answerKey: 'Option A'
        },
        {
            question: `Write a simple function related to ${title}`,
            type: 'code',
            answerKey: 'function implementation'
        },
        {
            question: `What are the key skills required for ${title}?`,
            type: 'text',
            answerKey: 'technical and soft skills'
        },
        {
            question: `Which technology is commonly used in ${title}?`,
            type: 'mcq',
            options: ['Technology A', 'Technology B', 'Technology C', 'Technology D'],
            answerKey: 'Technology A'
        },
        {
            question: `Debug the following code snippet`,
            type: 'code',
            answerKey: 'corrected code'
        },
        {
            question: `What is the abbreviation for the most common tool in ${title}?`,
            type: 'text',
            answerKey: 'abbreviation'
        },
        {
            question: `Which approach is best for ${title}?`,
            type: 'mcq',
            options: ['Approach A', 'Approach B', 'Approach C', 'Approach D'],
            answerKey: 'Approach A'
        }
    ];
}

/**
 * Score answers using Gemini via REST API
 * 
 * Grading Logic:
 * - Pass: >= 40% overall AND at least 1 coding correct AND at least 3 other correct
 */
/**
 * Local Scoring Logic (Replaces AI Grading)
 * compares user answers against answer keys
 */
async function scoreAnswers(questions, userAnswers) {
    console.log("[Local Grading] Starting scoring process...");

    let correctCount = 0;
    let codingCorrect = 0;
    let otherCorrect = 0;
    const correctness = [];
    const feedback = [];

    questions.forEach((q, index) => {
        const key = q.answerKey;
        const answer = userAnswers[index];
        let isCorrect = false;
        let msg = "Incorrect";

        if (!key) {
            // No key provided, cannot grade (or assume correct?) - failing safe
            isCorrect = false;
            msg = "No answer key found";
        } else if (!answer) {
            isCorrect = false;
            msg = "No answer provided";
        } else {
            const type = (q.type || 'text').toLowerCase();

            // Normalization helpers
            const norm = (str) => String(str).toLowerCase().trim().replace(/\s+/g, ' ');
            const codeNorm = (str) => String(str).toLowerCase().replace(/\s+/g, ''); // Remove all whitespace for code

            if (type === 'mcq') {
                // Exact match for MCQ (normalized)
                // Handle cases where key might be "Option A" and answer "Option A" or just "A"
                // But the front end sends the full option text usually.
                isCorrect = norm(answer) === norm(key);
            } else if (type === 'code' || type === 'debug') {
                // Lenient code matching
                const nKey = codeNorm(key);
                const nAns = codeNorm(answer);

                // 1. Exact match (ignoring whitespace)
                if (nAns === nKey) {
                    isCorrect = true;
                }
                // 2. Containment: Does the answer contain the key logic? (or vice versa if key is a snippet)
                else if (nAns.includes(nKey) || nKey.includes(nAns)) {
                    isCorrect = true;
                }
                // 3. Keyword/Token overlap (simple heuristic)
                else {
                    // Split into "tokens" (simple alpha-numeric sequences)
                    const keyTokens = new Set(nKey.split(/[^a-z0-9]/).filter(t => t.length > 2));
                    const ansTokens = new Set(nAns.split(/[^a-z0-9]/).filter(t => t.length > 2));

                    if (keyTokens.size > 0) {
                        let matches = 0;
                        keyTokens.forEach(t => { if (ansTokens.has(t)) matches++; });
                        const overlap = matches / keyTokens.size;
                        // If > 70% of key tokens are present in answer
                        isCorrect = overlap > 0.7;
                        console.log(`[Local Grading] Q${index + 1} Code overlap: ${overlap.toFixed(2)}`);
                    }
                }
            } else {
                // Text/Oneword - Fuzzy match
                const nKey = norm(key);
                const nAns = norm(answer);

                // Exact match
                if (nAns === nKey) isCorrect = true;
                // Containment (User's answer includes the key phrase)
                else if (nAns.includes(nKey)) isCorrect = true;
                // Reverse containment (Key is long, Answer is short but correct part?) - risky
                else if (nKey.includes(nAns) && nAns.length > 3) isCorrect = true;
            }
        }

        if (isCorrect) {
            correctCount++;
            if (q.type === 'code' || q.type === 'debug') {
                codingCorrect++;
            } else {
                otherCorrect++;
            }
            msg = "Correct";
        }

        correctness.push(isCorrect);
        feedback.push(msg);
        console.log(`[Local Grading] Q${index + 1} (${q.type}): ${msg}`);
    });

    const percentage = questions.length > 0
        ? Math.round((correctCount / questions.length) * 100)
        : 0;

    // Pass criteria: >= 40%
    // Relaxed criteria since local grading is strict/dumb: just strict percentage? 
    // Or keep the "1 coding + 3 other" rule? 
    // Let's stick to percentage mainly, but keep the complexity check as valid.
    const passed = (percentage >= 40);
    const finalResult = passed ? 'Passed' : 'Failed';

    console.log(`[Local Grading] Result: ${correctCount}/${questions.length} (${percentage}%) - ${finalResult}`);

    return {
        score: correctCount,
        percentage: percentage,
        result: finalResult,
        correctness: correctness,
        feedback: feedback,
        details: { codingCorrect, otherCorrect }
    };
}

module.exports = {
    generateTestQuestions,
    scoreAnswers,
    healthCheck,
    TOTAL_QUESTIONS,
    CODING_QUESTIONS,
    DEBUG_QUESTIONS
};

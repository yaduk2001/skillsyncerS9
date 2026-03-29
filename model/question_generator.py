"""
Question Generator CLI
Callable from Node.js backend to generate test questions using Gemini API.
Usage: python question_generator.py --topic "Topic Name" --skills "skill1,skill2"

This is a standalone script that doesn't depend on Streamlit.
"""

import sys
import os
import json
import argparse
import requests

# -----------------------------
# Gemini API configuration
# -----------------------------
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = "gemini-2.5-flash"
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

# Constants matching the JS gemini.js configuration
TOTAL_QUESTIONS = 8
CODING_QUESTIONS = 2
DEBUG_QUESTIONS = 1


def generate_gemini_response(prompt: str, temperature: float = 0.4, max_tokens: int = 8192) -> str:
    """Call Gemini API and return the response text."""
    if not API_KEY:
        return "Missing API key. Set GEMINI_API_KEY environment variable."

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens
        }
    }
    params = {"key": API_KEY}

    try:
        response = requests.post(
            ENDPOINT,
            headers=headers,
            params=params,
            json=payload,
            timeout=60,
        )
        if response.status_code == 200:
            data = response.json()
            return (
                data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
            )
        else:
            return f"Error {response.status_code}: {response.text}"
    except Exception as e:
        return f"Exception during request: {str(e)}"


def _extract_longest_balanced_json(text: str):
    """Return the longest balanced JSON object substring from text, or None."""
    if not isinstance(text, str):
        return None
    depth = 0
    start_idx = None
    best = None
    for i, ch in enumerate(text):
        if ch == '{':
            if depth == 0:
                start_idx = i
            depth += 1
        elif ch == '}':
            if depth > 0:
                depth -= 1
                if depth == 0 and start_idx is not None:
                    span = (start_idx, i + 1)
                    if best is None or (span[1] - span[0]) > (best[1] - best[0]):
                        best = span
    if best is None:
        return None
    return text[best[0]:best[1]]


def generate_mixed_question_set(
    topic: str,
    total_count: int = 8,
    coding_count: int = 2,
    debug_count: int = 1,
    temperature: float = 0.4,
    max_tokens: int = 2048,
):
    """Generate exactly 8 mixed-type questions with distribution constraints.

    - Exactly total_count questions (default 8)
    - Exactly coding_count coding questions (default 2)
    - Exactly debug_count debugging questions (default 1)
    - Remaining are MCQ or one_word in any mix

    Returns (parsed_dict_or_None, raw_text). On success, dict has shape:
    { "topic": str, "count": int, "questions": [
        { "type": "mcq|one_word|coding|debug", "question": str,
          "options"?: [str, str, str, str], "answer_index"?: int, "answer"?: str,
          "starter_code"?: str, "buggy_code"?: str, "fix"?: str }
      ] }
    """
    count = int(total_count)
    required_coding = int(coding_count)
    required_debug = int(debug_count)

    schema = (
        "{\n"
        "  \"topic\": string,\n"
        "  \"count\": integer,\n"
        "  \"questions\": [\n"
        "    {\n"
        "      \"type\": \"mcq|one_word|coding|debug\",\n"
        "      \"question\": string,\n"
        "      \"options\": [string, string, string, string]? ,\n"
        "      \"answer_index\": integer? ,\n"
        "      \"answer\": string? ,\n"
        "      \"starter_code\": string? ,\n"
        "      \"buggy_code\": string? ,\n"
        "      \"fix\": string?\n"
        "    }\n"
        "  ]\n"
        "}"
    )

    remaining = max(0, count - required_coding - required_debug)
    instruction = (
        "You are an assessment generator. Create a mixed set of concise interview questions for the given internship topic.\n"
        f"Output exactly {count} questions in total.\n"
        f"Exactly {required_coding} questions must have type=\"coding\".\n"
        f"Exactly {required_debug} question must have type=\"debug\".\n"
        f"The remaining {remaining} questions must be either type=\"mcq\" or type=\"one_word\" in any mix.\n"
        "Provide answers for every question. Keep any code under 200 characters.\n"
        "Return ONLY valid JSON (no markdown, no prose) matching this schema exactly: \n"
        + schema + "\n"
        f"Topic: {topic}"
    )

    raw = generate_gemini_response(instruction, temperature=temperature, max_tokens=max_tokens)
    if isinstance(raw, dict):
        return raw, json.dumps(raw)
    if not isinstance(raw, str):
        return None, str(raw)
    
    # Clean markdown code fences if present
    clean_raw = raw.strip()
    if clean_raw.startswith("```json"):
        clean_raw = clean_raw[7:]
    elif clean_raw.startswith("```"):
        clean_raw = clean_raw[3:]
    if clean_raw.endswith("```"):
        clean_raw = clean_raw[:-3]
    clean_raw = clean_raw.strip()
    
    try:
        parsed = json.loads(clean_raw)
        return parsed, raw
    except Exception:
        # Try to salvage using balanced JSON extraction
        extracted = _extract_longest_balanced_json(raw)
        if extracted:
            try:
                parsed = json.loads(extracted)
                return parsed, raw
            except Exception:
                pass
        # Retry once with stricter instruction
        strict = (
            instruction
            + "\nReturn ONLY JSON. No explanations, no code fences."
            + "\nIMPORTANT: The distribution MUST be exact as specified."
        )
        raw_retry = generate_gemini_response(strict, temperature=temperature, max_tokens=max_tokens)
        if isinstance(raw_retry, dict):
            return raw_retry, json.dumps(raw_retry)
        if isinstance(raw_retry, str):
            try:
                parsed = json.loads(raw_retry)
                return parsed, raw_retry
            except Exception:
                extracted = _extract_longest_balanced_json(raw_retry)
                if extracted:
                    try:
                        parsed = json.loads(extracted)
                        return parsed, raw_retry
                    except Exception:
                        pass
        return None, raw


def _validate_distribution(data: dict, total_count: int, coding_count: int, debug_count: int) -> bool:
    """Validate that the generated questions match the expected distribution."""
    try:
        questions = data.get("questions", [])
        if len(questions) != total_count:
            return False
        type_counts = {"coding": 0, "debug": 0, "mcq": 0, "one_word": 0}
        for q in questions:
            t = str(q.get("type", "")).lower()
            if t in type_counts:
                type_counts[t] += 1
        if type_counts["coding"] != coding_count:
            return False
        if type_counts["debug"] != debug_count:
            return False
        if (type_counts["mcq"] + type_counts["one_word"]) != (total_count - coding_count - debug_count):
            return False
        return True
    except Exception:
        return False


def map_question_type(qtype: str) -> str:
    """Map question types to the format expected by the test system."""
    mapping = {
        'mcq': 'mcq',
        'one_word': 'text',
        'coding': 'code',
        'debug': 'code'
    }
    return mapping.get(qtype.lower() if qtype else '', 'text')


def generate_fallback_questions(title: str) -> list:
    """Generate fallback questions if AI fails."""
    return [
        {
            "question": f"What is the primary purpose of {title}?",
            "type": "text",
            "answerKey": "industry-specific answer"
        },
        {
            "question": f"Which of the following best describes {title}?",
            "type": "mcq",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answerKey": "Option A"
        },
        {
            "question": f"Write a simple function related to {title}",
            "type": "code",
            "answerKey": "function implementation"
        },
        {
            "question": f"What are the key skills required for {title}?",
            "type": "text",
            "answerKey": "technical and soft skills"
        },
        {
            "question": f"Which technology is commonly used in {title}?",
            "type": "mcq",
            "options": ["Technology A", "Technology B", "Technology C", "Technology D"],
            "answerKey": "Technology A"
        },
        {
            "question": "Debug the following code snippet",
            "type": "code",
            "answerKey": "corrected code"
        },
        {
            "question": f"What is the abbreviation for the most common tool in {title}?",
            "type": "text",
            "answerKey": "abbreviation"
        },
        {
            "question": f"Which approach is best for {title}?",
            "type": "mcq",
            "options": ["Approach A", "Approach B", "Approach C", "Approach D"],
            "answerKey": "Approach A"
        }
    ]


def generate_questions(topic: str, skills: list = None) -> list:
    """
    Generate test questions using the Python Gemini implementation.
    
    Args:
        topic: The internship/test topic
        skills: Optional list of skills to focus on
        
    Returns:
        List of question dictionaries in the format expected by the backend
    """
    skills_text = ", ".join(skills) if skills else "General Technical Skills"
    full_topic = f"{topic} - Skills: {skills_text}"
    
    try:
        # Generate questions using Gemini
        data, raw = generate_mixed_question_set(
            topic=full_topic,
            total_count=TOTAL_QUESTIONS,
            coding_count=CODING_QUESTIONS,
            debug_count=DEBUG_QUESTIONS,
            temperature=0.4,
            max_tokens=8192
        )
        
        if data is None or not data.get("questions"):
            print("[Python] Failed to generate questions, using fallback", file=sys.stderr)
            return generate_fallback_questions(topic)
        
        # Validate distribution and retry if wrong
        if not _validate_distribution(data, TOTAL_QUESTIONS, CODING_QUESTIONS, DEBUG_QUESTIONS):
            print("[Python] Distribution incorrect, retrying...", file=sys.stderr)
            data, raw = generate_mixed_question_set(
                topic=full_topic,
                total_count=TOTAL_QUESTIONS,
                coding_count=CODING_QUESTIONS,
                debug_count=DEBUG_QUESTIONS,
                temperature=0.4,
                max_tokens=2048
            )
            
            if data is None or not data.get("questions"):
                return generate_fallback_questions(topic)
        
        # Convert to the format expected by the test system
        questions = []
        for q in data.get("questions", []):
            base = {
                "question": q.get("question", ""),
                "type": map_question_type(q.get("type", "")),
                "answerKey": q.get("answerKey") or q.get("answer") or q.get("fix") or ""
            }
            
            qtype = q.get("type", "").lower()
            
            if qtype == "mcq" and q.get("options"):
                base["options"] = q["options"]
                if isinstance(q.get("answer_index"), int):
                    try:
                        base["answerKey"] = q["options"][q["answer_index"]]
                    except (IndexError, TypeError):
                        pass
            
            if qtype == "coding" and q.get("starter_code"):
                base["starterCode"] = q["starter_code"]
            
            if qtype == "debug":
                if q.get("buggy_code"):
                    base["buggyCode"] = q["buggy_code"]
                if q.get("fix"):
                    base["fix"] = q["fix"]
            
            questions.append(base)
        
        print(f"[Python] Generated {len(questions)} questions successfully", file=sys.stderr)
        return questions
        
    except Exception as e:
        print(f"[Python] Error generating questions: {str(e)}", file=sys.stderr)
        return generate_fallback_questions(topic)


def main():
    parser = argparse.ArgumentParser(description="Generate test questions using Gemini API")
    parser.add_argument("--topic", type=str, required=True, help="The topic for question generation")
    parser.add_argument("--skills", type=str, default="", help="Comma-separated list of skills")
    
    args = parser.parse_args()
    
    skills = [s.strip() for s in args.skills.split(",") if s.strip()] if args.skills else []
    
    questions = generate_questions(args.topic, skills)
    
    # Output JSON to stdout for Node.js to parse
    print(json.dumps(questions, ensure_ascii=False))


if __name__ == "__main__":
    main()

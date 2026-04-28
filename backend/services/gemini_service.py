"""
Gemini AI Service — SRA AI
Uses Google Gemini to provide intelligent volunteer suggestions,
task explanations, and AI chat responses.
"""
import os
import json
import time
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.0-flash"

# --- Prompt Injection Protection ---
_BLOCKED_PATTERNS = [
    "ignore all", "ignore previous", "ignore above", "disregard",
    "system prompt", "reveal your", "show me your prompt",
    "bypass", "override", "pretend you are", "act as",
    "you are now", "forget your instructions", "new instructions",
    "do not follow", "jailbreak", "DAN mode",
]

MAX_USER_INPUT_LENGTH = 2000


def _sanitize_user_input(text: str) -> str:
    """Filter out prompt injection attempts and enforce length limits."""
    if not text:
        return ""
    text = text[:MAX_USER_INPUT_LENGTH]
    lowered = text.lower()
    for pattern in _BLOCKED_PATTERNS:
        if pattern in lowered:
            return "[Message filtered for safety]"
    return text


def _call_gemini(prompt: str, max_tokens: int = 1024, retries: int = 3) -> str:
    """Call the Gemini REST API with exponential backoff for 429 errors."""
    if not GEMINI_API_KEY:
        return "[SRA AI] Gemini API key not configured."

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}"
        f":generateContent?key={GEMINI_API_KEY}"
    )

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.3},
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                data = json.loads(response.read().decode("utf-8"))
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "No response from Gemini.")
            return "No response from Gemini."
        except urllib.error.HTTPError as e:
            if e.code == 429:
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s...
                    continue
                return f"[SRA AI Error] Rate limit exceeded (429). Fallback triggered."
            return f"[SRA AI Error] HTTP Error: {e.code}"
        except Exception as exc:
            return f"[SRA AI Error] {exc}"
    return "No response from Gemini."


def suggest_volunteers_ai(
    problem_type: str,
    severity: int,
    location: str,
    description: str,
    volunteers: list[dict],
) -> dict:
    """Ask Gemini to intelligently rank volunteers and provide practical task instructions."""
    volunteer_info = "\n".join(
        f"- ID:{v['id']}, Name:{v['name']}, Skills:{v.get('profession', '')}, Location:{v.get('address', '')}"
        for v in volunteers
    )

    prompt = (
        "You are SRA AI — the Smart Resource Allocation system for an NGO.\n\n"
        "A real-world emergency/incident needs attention:\n"
        f"  Type: {problem_type}\n"
        f"  Severity: {severity}/5\n"
        f"  Location: {location}\n"
        f"  Description: {description}\n\n"
        "Available volunteers:\n"
        f"{volunteer_info}\n\n"
        "Analyze this context and return a valid JSON object matching this exact schema:\n"
        "{\n"
        '  "best_volunteers": [\n'
        '    {"id": <volunteer_id>, "name": "...", "reason": "...", "score": <0-100 integer>}\n'
        "  ],\n"
        '  "summary": "...",\n'
        '  "solution": "...",\n'
        '  "steps": ["...", "..."]\n'
        "}\n\n"
        "Rules:\n"
        "1. Prioritize DISTANCE heavily. If a volunteer is located in the same area as the incident, their score should be >90.\n"
        "2. Prioritize relevant SKILLS (Profession) second.\n"
        "3. Provide realistic, practical, and actionable 'steps' (e.g., 'Evacuate area', 'Distribute water', 'Coordinate with local authorities').\n"
        "4. DO NOT return dummy text like 'AI detected 54% keywords'. Be professional and insightful.\n"
        "5. ONLY return valid raw JSON. No markdown ticks, no extra text."
    )

    raw = _call_gemini(prompt, max_tokens=1024)

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        result = json.loads(cleaned)
        return {
            "best_volunteers": result.get("best_volunteers", []),
            "summary": result.get("summary", ""),
            "solution": result.get("solution", ""),
            "steps": result.get("steps", []),
            "error": False
        }
    except Exception:
        # Fallback if Gemini fails or returns invalid JSON
        return {
            "best_volunteers": [],
            "summary": "AI processing failed. Please rely on manual matching.",
            "solution": "Follow standard operating procedures.",
            "steps": ["Assess the situation.", "Dispatch nearest volunteers.", "Report back to base."],
            "error": True
        }


def generate_task_explanation(
    problem_type: str,
    description: str,
    severity: int,
    location: str,
    people_affected: int,
) -> dict:
    """Generate practical AI task summary, suggested solution, and resolution steps."""
    prompt = (
        "You are SRA AI — the Smart Resource Allocation system for an NGO.\n\n"
        "A volunteer has been assigned to this incident:\n"
        f"  Type: {problem_type}\n"
        f"  Severity: {severity}/5\n"
        f"  Location: {location}\n"
        f"  People Affected: {people_affected}\n"
        f"  Description: {description}\n\n"
        "Provide:\n"
        "1. A brief practical SUMMARY of the problem (2-3 sentences)\n"
        "2. A realistic SUGGESTED SOLUTION (2-3 sentences)\n"
        "3. STEPS TO RESOLVE (numbered list, 4-6 actionable steps. e.g., 'Use protective gear', 'Contact local hospital')\n\n"
        "Return ONLY valid JSON with keys: summary, suggested_solution, steps (array of strings). No markdown."
    )

    raw = _call_gemini(prompt, max_tokens=800)

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        result = json.loads(cleaned)
        return {
            "summary": result.get("summary", ""),
            "suggested_solution": result.get("suggested_solution", ""),
            "steps": result.get("steps", []),
        }
    except (json.JSONDecodeError, Exception):
        return {
            "summary": "Follow standard safety guidelines.",
            "suggested_solution": "Assess the area and help affected individuals.",
            "steps": ["Reach the location.", "Assess risks.", "Provide immediate relief.", "Update the system."],
        }


def ai_chat_response(user_message: str, context: str = "") -> str:
    """Generate an AI response for the SRA AI chat system."""
    # Sanitize user input to prevent prompt injection
    user_message = _sanitize_user_input(user_message)

    prompt = (
        "You are SRA AI — the intelligent assistant for SmartAid, "
        "an NGO resource allocation platform.\n\n"
        "A user is chatting with you. Be helpful, concise, and professional.\n"
        "If asked about their application status, guide them to check with the admin.\n"
        "If asked about volunteering, explain the process.\n"
        "If asked general questions, answer helpfully.\n\n"
    )
    if context:
        prompt += f"Context: {context}\n\n"
    prompt += f"User message: {user_message}\n\nSRA AI response:"

    return _call_gemini(prompt, max_tokens=400)

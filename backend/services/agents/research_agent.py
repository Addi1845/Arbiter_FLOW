from groq import Groq
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from services.extractor import parse_groq_json

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"


def run_research(extraction: dict) -> dict:
    """Research Agent — builds the strongest case for the primary recommendation."""
    extraction_json = json.dumps(extraction, indent=2)

    system_prompt = """You are a senior government legal advisor in India with 20 years of experience handling High Court judgments.
You are the RESEARCH agent. Build the STRONGEST CASE for what you believe is the correct action.
Respond ONLY with valid JSON. No markdown. No explanation. Just raw JSON starting with { and ending with }"""

    user_prompt = f"""Analyze this court judgment extraction and provide your research-based recommendation.

EXTRACTION DATA:
{extraction_json}

Return ONLY this JSON (no extra text):
{{
  "recommendation": "COMPLY or APPEAL or ESCALATE",
  "confidence": 0.85,
  "primary_reasoning": "2-3 sentence explanation of recommendation",
  "key_points": ["point 1", "point 2", "point 3"],
  "directive_analysis": [
    {{
      "clause": "directive text",
      "assessment": "what this means for government",
      "urgency": "HIGH or MEDIUM or LOW",
      "action_required": "specific action needed"
    }}
  ],
  "legal_position": "assessment of government legal standing",
  "risk_if_ignored": "what happens if government ignores this",
  "timeline_assessment": "assessment of time available",
  "precedent_note": "relevant legal principle",
  "research_summary": "one paragraph executive summary"
}}"""

    print(f"[RESEARCH] Calling Groq API...")
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=3000
        )
        raw_response = response.choices[0].message.content
    except Exception as e:
        raise ValueError(f"Research agent failed: {e}")

    try:
        research = parse_groq_json(raw_response)
    except ValueError:
        raise ValueError("Research agent returned invalid JSON")

    research.setdefault("recommendation", "COMPLY")
    research.setdefault("confidence", 0.5)
    research.setdefault("primary_reasoning", "")
    research.setdefault("key_points", [])
    research.setdefault("research_summary", "")

    research["agent"] = "research"
    research["ran_at"] = datetime.utcnow().isoformat()
    research["model"] = MODEL

    print(f"[RESEARCH AGENT] Recommendation: {research.get('recommendation')}, Confidence: {research.get('confidence')}")
    return research

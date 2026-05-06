from groq import Groq
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from services.extractor import parse_groq_json

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"


def run_counter(extraction: dict, research: dict) -> dict:
    """Counter Agent — challenges the Research Agent with devil's advocate arguments."""
    extraction_json = json.dumps(extraction, indent=2)
    research_json = json.dumps(research, indent=2)

    system_prompt = """You are a sharp government legal counsel in India specializing in challenging court compliance decisions.
You are the COUNTER agent. Be the devil's advocate. Challenge the Research Agent's position completely.
If Research says COMPLY → argue for APPEAL. If APPEAL → argue for COMPLY. If ESCALATE → argue for direct action.
Respond ONLY with valid JSON. No markdown. No explanation. Just raw JSON starting with { and ending with }"""

    user_prompt = f"""Challenge the Research Agent's recommendation with strong counter-arguments.

ORIGINAL EXTRACTION:
{extraction_json}

RESEARCH AGENT RECOMMENDATION:
{research_json}

Return ONLY this JSON (no extra text):
{{
  "counter_recommendation": "COMPLY or APPEAL or ESCALATE",
  "counter_confidence": 0.75,
  "primary_counter_reasoning": "2-3 sentences challenging research",
  "weaknesses_in_research": ["weakness 1", "weakness 2"],
  "counter_key_points": ["counter point 1", "counter point 2", "counter point 3"],
  "risks_research_missed": ["risk 1", "risk 2"],
  "appeal_viability": "assessment of appeal success probability",
  "compliance_cost_assessment": "cost and effort of compliance",
  "government_vulnerability": "where government is most exposed",
  "counter_summary": "one paragraph counter-argument summary"
}}"""

    print(f"[COUNTER] Calling Groq API...")
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=3000
        )
        raw_response = response.choices[0].message.content
    except Exception as e:
        raise ValueError(f"Counter agent failed: {e}")

    try:
        counter = parse_groq_json(raw_response)
    except ValueError:
        raise ValueError("Counter agent returned invalid JSON")

    counter.setdefault("counter_recommendation", "APPEAL")
    counter.setdefault("counter_confidence", 0.5)
    counter.setdefault("primary_counter_reasoning", "")
    counter.setdefault("weaknesses_in_research", [])
    counter.setdefault("counter_key_points", [])
    counter.setdefault("counter_summary", "")

    counter["agent"] = "counter"
    counter["ran_at"] = datetime.utcnow().isoformat()
    counter["model"] = MODEL
    counter["challenging"] = research.get("recommendation")

    print(f"[COUNTER AGENT] Counter: {counter.get('counter_recommendation')}, Challenging: {research.get('recommendation')}")
    return counter

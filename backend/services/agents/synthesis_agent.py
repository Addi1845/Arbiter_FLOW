from groq import Groq
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from services.extractor import parse_groq_json

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"


def calculate_deadline(date_of_order: str) -> str:
    import re
    if not date_of_order or not date_of_order.strip():
        return "Calculate manually — 90 days from order date"

    formats = [
        "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d",
        "%d %B %Y", "%d %b %Y", "%B %d, %Y",
    ]
    parsed_date = None
    for fmt in formats:
        try:
            parsed_date = datetime.strptime(date_of_order.strip(), fmt)
            break
        except ValueError:
            continue

    if not parsed_date:
        patterns = [
            r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})',
            r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})',
        ]
        for pattern in patterns:
            match = re.search(pattern, date_of_order)
            if match:
                g = match.groups()
                try:
                    if len(g[0]) == 4:
                        parsed_date = datetime(int(g[0]), int(g[1]), int(g[2]))
                    else:
                        parsed_date = datetime(int(g[2]), int(g[1]), int(g[0]))
                    break
                except ValueError:
                    continue

    if not parsed_date:
        return "Calculate manually — 90 days from order date"

    current_year = datetime.utcnow().year
    if parsed_date.year < current_year - 1:
        return f"Verify date — order appears historical ({date_of_order})"

    deadline = parsed_date + timedelta(days=83)
    return deadline.strftime("%d-%m-%Y")


def run_synthesis(extraction: dict, research: dict, counter: dict) -> dict:
    """Synthesis Agent — makes the final authoritative recommendation."""
    extraction_json = json.dumps(extraction, indent=2)
    research_json = json.dumps(research, indent=2)
    counter_json = json.dumps(counter, indent=2)
    deadline = calculate_deadline(extraction.get("date_of_order", ""))

    system_prompt = """You are the Chief Legal Advisor to the Government of India with authority to make final decisions on court judgment responses.
You have received analysis from two opposing legal advisors. Weigh both sides fairly and make the FINAL DEFINITIVE recommendation.
Be decisive. Use plain language — government officials reading this are not lawyers.
Respond ONLY with valid JSON. No markdown. No explanation. Just raw JSON starting with { and ending with }

IMPORTANT: final_confidence must reflect genuine uncertainty.
If the document has missing data, incomplete directives, or ambiguous orders, confidence must be LOW (0.4-0.6).
Only give 0.85+ when you have complete, clear, unambiguous information to work with.
Never default to 0.9 as a safe answer — it must be earned."""

    user_prompt = f"""Make the final decision based on both agents' analysis.

ORIGINAL EXTRACTION:
{extraction_json}

RESEARCH AGENT (Primary Case):
{research_json}

COUNTER AGENT (Challenge):
{counter_json}

CALCULATED APPEAL DEADLINE: {deadline}

Return ONLY this JSON (no extra text):
{{
  "final_recommendation": "COMPLY or APPEAL or ESCALATE",
  "final_confidence": 0.75,
  "decision_reasoning": "3-4 sentences explaining final decision",
  "research_points_accepted": ["accepted research point 1"],
  "counter_points_accepted": ["accepted counter point 1"],
  "comply_arguments": ["argument for complying"],
  "appeal_arguments": ["argument for appeal"],
  "final_verdict_summary": "one clear paragraph for government officials",
  "action_items": [
    {{
      "action": "specific action in plain language — MANDATORY, minimum 3 items",
      "owner": "department or designation",
      "due_date": "DD-MM-YYYY or Immediate or Within X days",
      "priority": "HIGH or MEDIUM or LOW"
    }},
    {{
      "action": "second mandatory action item",
      "owner": "relevant department",
      "due_date": "Within 7 days",
      "priority": "HIGH"
    }},
    {{
      "action": "third mandatory action item",
      "owner": "Law Department",
      "due_date": "Before deadline",
      "priority": "MEDIUM"
    }}
  ],
  "responsible_department": "primary department responsible",
  "priority": "HIGH or MEDIUM or LOW",
  "escalation_needed": false,
  "escalation_reason": "",
  "risk_level": "HIGH or MEDIUM or LOW",
  "estimated_compliance_effort": "LOW or MEDIUM or HIGH"
}}

MANDATORY: action_items array must have at least 3 items. NEVER return empty action_items = []"""

    print(f"[SYNTHESIS] Calling Groq API...")
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            max_tokens=4000
        )
        raw_response = response.choices[0].message.content
    except Exception as e:
        raise ValueError(f"Synthesis agent failed: {e}")

    try:
        synthesis = parse_groq_json(raw_response)
    except ValueError:
        raise ValueError("Synthesis agent returned invalid JSON")

    synthesis.setdefault("final_recommendation", "COMPLY")
    synthesis.setdefault("final_confidence", 0.7)
    synthesis.setdefault("decision_reasoning", "")
    synthesis.setdefault("final_verdict_summary", "")
    synthesis.setdefault("action_items", [])
    synthesis.setdefault("comply_arguments", [])
    synthesis.setdefault("appeal_arguments", [])
    synthesis.setdefault("responsible_department", "")
    synthesis.setdefault("priority", "MEDIUM")
    synthesis.setdefault("risk_level", "MEDIUM")

    # FIX 3 — Force generate action items if AI returned empty
    if not synthesis.get("action_items"):
        recommendation = synthesis.get("final_recommendation", "COMPLY")
        deadline = synthesis.get("deadline_date", "Within 90 days")
        dept = synthesis.get("responsible_department", "Concerned Department")

        if recommendation == "COMPLY":
            synthesis["action_items"] = [
                {"action": f"Identify nodal officer responsible for compliance with this judgment", "owner": dept, "due_date": "Immediate — within 3 days", "priority": "HIGH"},
                {"action": "Prepare detailed compliance plan addressing all court directives", "owner": dept + " Legal Cell", "due_date": "Within 7 days", "priority": "HIGH"},
                {"action": "Submit compliance report to court through government pleader", "owner": "Government Pleader Office", "due_date": deadline, "priority": "HIGH"},
                {"action": "Inform all concerned officers about judgment and required actions", "owner": dept, "due_date": "Within 5 days", "priority": "MEDIUM"}
            ]
        elif recommendation == "APPEAL":
            synthesis["action_items"] = [
                {"action": "Consult senior government counsel to assess grounds for appeal", "owner": "Law Department", "due_date": "Immediate — within 48 hours", "priority": "HIGH"},
                {"action": "Prepare memorandum of appeal with detailed grounds for challenge", "owner": f"Law Department + {dept}", "due_date": "Within 14 days", "priority": "HIGH"},
                {"action": "File appeal in appropriate court before limitation period expires", "owner": "Government Pleader Office", "due_date": deadline, "priority": "HIGH"},
                {"action": "Apply for stay of operation of judgment pending appeal if required", "owner": "Law Department", "due_date": "Within 7 days", "priority": "HIGH"}
            ]
        else:  # ESCALATE
            synthesis["action_items"] = [
                {"action": "Brief department secretary on judgment and its implications", "owner": "Department Head", "due_date": "Immediate — within 24 hours", "priority": "HIGH"},
                {"action": "Prepare comprehensive case summary for ministerial review", "owner": dept, "due_date": "Within 3 days", "priority": "HIGH"},
                {"action": "Coordinate with Law Department for interdepartmental response strategy", "owner": "Law Department", "due_date": "Within 7 days", "priority": "HIGH"}
            ]
        print(f"[SYNTHESIS] Generated {len(synthesis['action_items'])} fallback action items for {recommendation}")

    synthesis["agent"] = "synthesis"
    synthesis["ran_at"] = datetime.utcnow().isoformat()
    synthesis["model"] = MODEL
    synthesis["deadline_date"] = deadline
    synthesis["research_recommendation"] = research.get("recommendation")
    synthesis["counter_recommendation"] = counter.get("counter_recommendation")
    synthesis["debate_summary"] = {
        "research_confidence": research.get("confidence"),
        "counter_confidence": counter.get("counter_confidence"),
        "final_confidence": synthesis.get("final_confidence"),
        "agreement": research.get("recommendation") == counter.get("counter_recommendation")
    }

    print(f"[SYNTHESIS AGENT] Final: {synthesis.get('final_recommendation')}, Deadline: {deadline}")
    return synthesis

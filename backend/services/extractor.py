from groq import Groq
import json
import re
from datetime import datetime
import os
from dotenv import load_dotenv
from firebase_config import db

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"
MAX_TEXT_LENGTH = 80000
LOW_CONFIDENCE_THRESHOLD = 0.70


def parse_groq_json(raw_text: str) -> dict:
    """Safely parses JSON from Groq response."""
    try:
        return json.loads(raw_text.strip())
    except json.JSONDecodeError:
        pass

    match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    cleaned = re.sub(r'```json|```', '', raw_text).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    raise ValueError(f"Cannot parse JSON from response: {raw_text[:300]}")


# Alias so agents can import it
parse_claude_json = parse_groq_json
parse_gemini_json = parse_groq_json


def validate_is_judgment(full_text: str) -> dict:
    """Validates that the document is actually a court judgment."""
    text_lower = full_text.lower()[:3000]

    judgment_keywords = [
        "court", "judgment", "judgement", "order",
        "petition", "petitioner", "respondent",
        "appellant", "plaintiff", "defendant",
        "hon'ble", "honourable", "justice",
        "writ", "appeal", "versus", " vs ",
        "whereby", "wherefore", "directed",
        "high court", "supreme court", "tribunal",
        "civil", "criminal", "disposed"
    ]

    found_keywords = [k for k in judgment_keywords if k in text_lower]
    keyword_score = len(found_keywords)
    is_valid = keyword_score >= 5

    return {
        "is_valid": is_valid,
        "keyword_score": keyword_score,
        "found_keywords": found_keywords[:10],
        "reason": "Valid court judgment" if is_valid
            else f"Document does not appear to be a court judgment. Only {keyword_score} legal keywords found. Found: {found_keywords}"
    }


def extract_judgment(judgment_id: str) -> dict:
    """Extracts structured data from a judgment using Groq (Llama 3.3 70B)."""
    print(f"[EXTRACT] Starting extraction for {judgment_id}")

    doc_ref = db.collection("judgments").document(judgment_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise ValueError(f"Judgment not found: {judgment_id}")

    judgment_data = doc.to_dict()
    full_text = judgment_data.get("full_text", "")

    if not full_text:
        raise ValueError("No text content found in judgment")

    if len(full_text) > MAX_TEXT_LENGTH:
        full_text = full_text[:MAX_TEXT_LENGTH] + "\n[TEXT TRUNCATED]"

    # Validate document is a real court judgment
    validation = validate_is_judgment(full_text)
    if not validation["is_valid"]:
        print(f"[EXTRACT] INVALID DOCUMENT — {validation['reason']}")
        doc_ref.update({
            "extraction_status": "invalid_document",
            "validation_error": validation["reason"],
            "keyword_score": validation["keyword_score"]
        })
        db.collection("extractions").document(judgment_id).set({
            "judgment_id": judgment_id,
            "extraction_status": "invalid_document",
            "validation_error": validation["reason"],
            "is_valid_judgment": False,
            "overall_confidence": 0.0,
            "directives": [],
            "timelines": [],
            "case_number": "",
            "court_name": "",
            "date_of_order": "",
            "petitioner": "",
            "respondent": "",
            "subject_matter": "INVALID: " + validation["reason"],
            "department_hint": ""
        })
        raise ValueError(f"INVALID_DOCUMENT: {validation['reason']}")

    print(f"[EXTRACT] Document validated — {validation['keyword_score']} legal keywords found")
    doc_ref.update({"extraction_status": "extracting"})

    system_prompt = """You are a legal document analysis AI for the Indian government.
Extract structured information from High Court judgments.
Respond ONLY with a valid JSON object. No explanation, no markdown, no code blocks.
Just raw JSON starting with { and ending with }"""

    user_prompt = f"""Extract structured data from this Indian High Court judgment.

CONFIDENCE SCORING RULES — FOLLOW STRICTLY:
- overall_confidence is calculated by adding to a 0.20 base score:
  +0.15 if case_number is clearly found in document
  +0.10 if date_of_order is clearly stated
  +0.15 if both petitioner AND respondent are named
  +0.20 if at least 2 clear directives/orders found
  +0.15 if timelines with specific dates are present
- Maximum possible: 0.95. Minimum: 0.20
- A document with missing case number, vague parties, no directives → 0.30-0.45
- NEVER return 0.9 or 1.0 unless ALL fields are explicitly and clearly stated
- For each directive's confidence:
  1.0 = exact quoted court order text
  0.8 = clear directive, slightly paraphrased
  0.6 = inferred from context
  0.4 = uncertain, needs human review
  NEVER give all directives the same confidence score

Return ONLY this exact JSON structure (no extra text):
{{
  "case_number": "full case number",
  "court_name": "name of court",
  "date_of_order": "DD-MM-YYYY format",
  "petitioner": "petitioner name",
  "respondent": "respondent name",
  "bench": "judge names",
  "subject_matter": "one sentence about the case",
  "department_hint": "government department concerned",
  "directives": [
    {{
      "clause": "exact directive or order text",
      "confidence": 0.95,
      "action_type": "COMPLY or APPEAL or ESCALATE or INFORM",
      "urgency": "HIGH or MEDIUM or LOW"
    }}
  ],
  "timelines": [
    {{
      "description": "what needs to happen",
      "date": "DD-MM-YYYY or empty string",
      "days_mentioned": "number or empty string",
      "is_inferred": false
    }}
  ],
  "appeal_mentioned": true,
  "compliance_mentioned": true,
  "penalty_mentioned": false,
  "overall_confidence": 0.85
}}

JUDGMENT TEXT:
{full_text}"""

    print(f"[EXTRACT] Calling Groq API for {judgment_id}...")
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
        print(f"[EXTRACT] Groq API error: {e}")
        doc_ref.update({"extraction_status": "failed", "error_message": str(e)})
        raise

    print("[EXTRACT] Response received, parsing JSON...")
    try:
        extracted = parse_groq_json(raw_response)
    except ValueError as e:
        print(f"[EXTRACT] Parse error: {e}")
        doc_ref.update({"extraction_status": "failed"})
        raise ValueError("Groq returned invalid JSON")

    extracted["judgment_id"] = judgment_id
    extracted["extraction_status"] = "completed"
    extracted["extracted_at"] = datetime.utcnow().isoformat()
    extracted["model_used"] = MODEL

    flagged_count = 0
    directives = extracted.get("directives", [])
    for directive in directives:
        if directive.get("confidence", 1.0) < LOW_CONFIDENCE_THRESHOLD:
            directive["requires_human_review"] = True
            flagged_count += 1
        else:
            directive["requires_human_review"] = False

    extracted["flagged_count"] = flagged_count
    extracted["total_directives"] = len(directives)

    try:
        db.collection("extractions").document(judgment_id).set(extracted)
        doc_ref.update({
            "extraction_status": "completed",
            "extracted_at": extracted["extracted_at"]
        })
        print(f"[EXTRACT] Extraction completed for {judgment_id}")
    except Exception as e:
        print(f"[EXTRACT] Firestore save error: {e}")

    return extracted


def get_extraction(judgment_id: str) -> dict:
    """Fetches extraction data from Firestore."""
    doc = db.collection("extractions").document(judgment_id).get()
    if not doc.exists:
        raise ValueError("Extraction not found")
    return doc.to_dict()

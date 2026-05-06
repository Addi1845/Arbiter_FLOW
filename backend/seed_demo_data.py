import os
import sys
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    try:
        cred = credentials.Certificate("firebase_credentials.json")
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        sys.exit(1)

db = firestore.client()

def clear_collection(collection_name):
    docs = db.collection(collection_name).stream()
    batch = db.batch()
    count = 0
    for doc in docs:
        batch.delete(doc.reference)
        count += 1
        if count % 100 == 0:
            batch.commit()
    if count > 0:
        batch.commit()
    print(f"Cleared {count} docs from {collection_name}")

def seed_data():
    collections = ["judgments", "extractions", "agent_outputs", "verified_records"]
    for c in collections:
        clear_collection(c)

    today = datetime.utcnow()
    
    # 5 Demo records
    records = [
        {
            "id": "AF-9821-DEL",
            "case_number": "W.P.(C) 4592/2023",
            "court_name": "High Court of Delhi",
            "department": "Transport Department",
            "recommendation": "COMPLY",
            "priority": "MEDIUM",
            "deadline_offset": 20,
            "confidence": 0.95,
            "ai_accepted": True
        },
        {
            "id": "AF-7734-MAH",
            "case_number": "PIL 102/2022",
            "court_name": "High Court of Bombay",
            "department": "Urban Development",
            "recommendation": "ESCALATE",
            "priority": "HIGH",
            "deadline_offset": 5,
            "confidence": 0.88,
            "ai_accepted": False
        },
        {
            "id": "AF-6512-KAR",
            "case_number": "CRL.P 883/2024",
            "court_name": "High Court of Karnataka",
            "department": "Home Department",
            "recommendation": "APPEAL",
            "priority": "HIGH",
            "deadline_offset": 2, # Critical
            "confidence": 0.91,
            "ai_accepted": True
        },
        {
            "id": "AF-5501-TN",
            "case_number": "W.A. 201/2021",
            "court_name": "Madras High Court",
            "department": "Revenue Department",
            "recommendation": "APPEAL",
            "priority": "HIGH",
            "deadline_offset": -3, # Overdue
            "confidence": 0.93,
            "ai_accepted": True
        },
        {
            "id": "AF-3392-UP",
            "case_number": "CIVIL A. 765/2023",
            "court_name": "Allahabad High Court",
            "department": "Education Department",
            "recommendation": "COMPLY",
            "priority": "LOW",
            "deadline_offset": 45,
            "confidence": 0.98,
            "ai_accepted": True
        }
    ]

    for r in records:
        deadline_date = today + timedelta(days=r["deadline_offset"])
        deadline_str = deadline_date.strftime("%d-%m-%Y")
        
        # 1. judgments
        db.collection("judgments").document(r["id"]).set({
            "judgment_id": r["id"],
            "filename": f"{r['case_number'].replace('/', '_')}_Judgment.pdf",
            "upload_timestamp": (today - timedelta(days=2)).isoformat(),
            "status": "completed",
            "extraction_status": "completed",
            "agent_status": "completed",
            "verification_status": "completed",
            "final_recommendation": r["recommendation"],
            "priority": r["priority"],
            "deadline_date": deadline_str,
            "subject_matter": "Administrative action review",
            "page_count": 12
        })

        # 2. extractions
        db.collection("extractions").document(r["id"]).set({
            "judgment_id": r["id"],
            "case_details": {
                "case_number": r["case_number"],
                "court_name": r["court_name"],
                "department": r["department"]
            },
            "directives": [
                {"text": "State to file compliance report", "type": "ACTION", "deadline": deadline_str}
            ],
            "extracted_at": (today - timedelta(days=1)).isoformat()
        })

        # 3. agent_outputs
        db.collection("agent_outputs").document(r["id"]).set({
            "judgment_id": r["id"],
            "final_recommendation": r["recommendation"],
            "final_confidence": r["confidence"],
            "priority": r["priority"],
            "deadline_date": deadline_str,
            "responsible_department": r["department"],
            "completed_at": (today - timedelta(hours=12)).isoformat(),
            "debate_summary": {
                "pros": ["Clear directive", "Low cost of compliance"],
                "cons": ["Sets precedent"],
                "resolution": "Benefits outweigh risks"
            }
        })

        # 4. verified_records
        db.collection("verified_records").document(r["id"]).set({
            "judgment_id": r["id"],
            "case_details": {
                "case_number": r["case_number"],
                "court_name": r["court_name"],
                "department": r["department"]
            },
            "final_recommendation": r["recommendation"],
            "priority": r["priority"],
            "deadline_date": deadline_str,
            "verified_by": "Demo Admin",
            "verified_at": (today - timedelta(hours=2)).isoformat(),
            "is_edited": not r["ai_accepted"],
            "is_rejected": False,
            "action_items": [
                "Draft response",
                "Approve budget"
            ]
        })

    print("Demo data seeded successfully!")

if __name__ == "__main__":
    seed_data()

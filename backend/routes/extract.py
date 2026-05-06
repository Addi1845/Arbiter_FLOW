from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from firebase_config import db
from services.extractor import extract_judgment, get_extraction
from datetime import datetime

from limiter import limiter

# This route handles initiating extraction of structured data from a judgment
router = APIRouter(prefix="/extract", tags=["extract"])

@router.post("/{judgment_id}")
@limiter.limit("20/minute")
async def start_extraction(request: Request, judgment_id: str, background_tasks: BackgroundTasks):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        doc_ref = db.collection("judgments").document(judgment_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Judgment not found")
            
        data = doc.to_dict()
        status = data.get("extraction_status")
        
        if status == "completed":
            return {
                "judgment_id": judgment_id,
                "message": "Already extracted",
                "extraction_status": "completed",
                "extracted_at": data.get("extracted_at")
            }
            
        if status == "extracting":
            return {
                "judgment_id": judgment_id,
                "message": "Extraction already in progress",
                "extraction_status": "extracting"
            }
            
        # Trigger background task
        background_tasks.add_task(extract_judgment, judgment_id)
        
        return {
            "judgment_id": judgment_id,
            "message": "Extraction started",
            "extraction_status": "extracting",
            "started_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error starting extraction: {e}")
        raise HTTPException(status_code=500, detail="Failed to start extraction")

@router.get("/{judgment_id}")
async def get_extraction_result(judgment_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        # Check extractions collection
        doc = db.collection("extractions").document(judgment_id).get()
        if doc.exists:
            return doc.to_dict()
            
        # Check judgments collection for status
        judg_doc = db.collection("judgments").document(judgment_id).get()
        if judg_doc.exists:
            return {
                "judgment_id": judgment_id,
                "extraction_status": judg_doc.to_dict().get("extraction_status", "pending"),
                "message": "Extraction not yet started"
            }
            
        raise HTTPException(status_code=404, detail="Extraction not found")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting extraction result: {e}")
        raise HTTPException(status_code=500, detail="Failed to get extraction result")

@router.get("/{judgment_id}/summary")
async def get_extraction_summary(judgment_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        extraction = get_extraction(judgment_id)
        
        return {
            "judgment_id": judgment_id,
            "case_number": extraction.get("case_number", ""),
            "court": extraction.get("court_name", ""),
            "date": extraction.get("date_of_order", ""),
            "parties": {
                "petitioner": extraction.get("petitioner", ""),
                "respondent": extraction.get("respondent", "")
            },
            "subject": extraction.get("subject_matter", ""),
            "department": extraction.get("department_hint", ""),
            "total_directives": extraction.get("total_directives", 0),
            "flagged_for_review": extraction.get("flagged_count", 0),
            "key_directives": extraction.get("directives", [])[:3],
            "upcoming_timelines": extraction.get("timelines", []),
            "flags": {
                "appeal_mentioned": extraction.get("appeal_mentioned", False),
                "compliance_mentioned": extraction.get("compliance_mentioned", False),
                "penalty_mentioned": extraction.get("penalty_mentioned", False)
            },
            "overall_confidence": extraction.get("overall_confidence", 0)
        }
    except ValueError as e:
        if str(e) == "Extraction not found":
            raise HTTPException(status_code=404, detail="Extraction not found")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Error getting extraction summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get extraction summary")


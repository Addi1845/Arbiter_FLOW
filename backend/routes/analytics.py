from fastapi import APIRouter, HTTPException
from firebase_config import db
from datetime import datetime
from collections import defaultdict

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/overview")
async def get_analytics_overview():
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    judgments = list(db.collection("judgments").stream())
    verified = list(db.collection("verified_records").stream())
    verified = [v for v in verified if not v.to_dict().get("is_rejected")]
    
    total_uploaded = len(judgments)
    extraction_completed = sum(1 for j in judgments if j.to_dict().get("extraction_status") == "completed")
    agents_completed = sum(1 for j in judgments if j.to_dict().get("agent_status") == "completed")
    pending_review = sum(1 for j in judgments if j.to_dict().get("verification_status") == "pending")
    
    total_verified = len(verified)
    comply_count = sum(1 for v in verified if v.to_dict().get("final_recommendation") == "COMPLY")
    appeal_count = sum(1 for v in verified if v.to_dict().get("final_recommendation") == "APPEAL")
    escalate_count = sum(1 for v in verified if v.to_dict().get("final_recommendation") == "ESCALATE")
    
    human_edited = sum(1 for v in verified if v.to_dict().get("is_edited") == True)
    
    ai_accepted_as_is = total_verified - human_edited
    ai_accuracy_proxy = ai_accepted_as_is / total_verified if total_verified > 0 else 0
    edit_rate_percent = (human_edited / total_verified * 100) if total_verified > 0 else 0
    
    dept_counts = defaultdict(int)
    for v in verified:
        dept = v.to_dict().get("case_details", {}).get("department", "Unknown")
        dept_counts[dept] += 1
        
    department_breakdown = [{"department": k, "count": v} for k, v in sorted(dept_counts.items(), key=lambda x: x[1], reverse=True)]
    
    return {
        "pipeline_stats": {
            "total_uploaded": total_uploaded,
            "extraction_completed": extraction_completed,
            "agents_completed": agents_completed,
            "pending_review": pending_review,
            "total_verified": total_verified
        },
        "recommendation_breakdown": {
            "comply": comply_count,
            "appeal": appeal_count,
            "escalate": escalate_count
        },
        "verification_quality": {
            "total_verified": total_verified,
            "human_edited": human_edited,
            "ai_accepted_as_is": ai_accepted_as_is,
            "ai_accuracy_proxy": round(ai_accuracy_proxy, 2),
            "edit_rate_percent": round(edit_rate_percent, 1)
        },
        "department_breakdown": department_breakdown,
        "generated_at": datetime.utcnow().isoformat()
    }

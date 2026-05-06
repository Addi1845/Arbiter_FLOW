from fastapi import APIRouter, HTTPException
from firebase_config import db
from datetime import datetime

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("/urgent")
async def get_urgent_alerts():
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
    
    docs = db.collection("verified_records").stream()
    urgent_alerts = []
    today = datetime.utcnow().date()
    
    for doc in docs:
        data = doc.to_dict()
        if data.get("is_rejected"):
            continue
        deadline_date_str = data.get("deadline_date")
        if not deadline_date_str or deadline_date_str == "N/A":
            continue
        try:
            deadline = datetime.strptime(deadline_date_str, "%d-%m-%Y").date()
        except ValueError:
            try:
                deadline = datetime.fromisoformat(deadline_date_str[:10]).date()
            except:
                continue
        days_remaining = (deadline - today).days
        if 0 <= days_remaining <= 14:
            urgent_alerts.append({
                "judgment_id": data.get("judgment_id"),
                "case_number": data.get("case_details", {}).get("case_number", "N/A"),
                "court_name": data.get("case_details", {}).get("court_name", "N/A"),
                "department": data.get("case_details", {}).get("department", "N/A"),
                "final_recommendation": data.get("final_recommendation"),
                "priority": data.get("priority"),
                "deadline_date": deadline_date_str,
                "days_remaining": days_remaining,
                "alert_level": "CRITICAL" if days_remaining <= 3 else "HIGH" if days_remaining <= 7 else "MEDIUM",
                "action_items": data.get("action_items", []),
                "verified_by": data.get("verified_by")
            })
            
    urgent_alerts.sort(key=lambda x: x["days_remaining"])
    return {
        "total_urgent": len(urgent_alerts),
        "critical": sum(1 for x in urgent_alerts if x["alert_level"] == "CRITICAL"),
        "high": sum(1 for x in urgent_alerts if x["alert_level"] == "HIGH"),
        "medium": sum(1 for x in urgent_alerts if x["alert_level"] == "MEDIUM"),
        "alerts": urgent_alerts
    }

@router.get("/overdue")
async def get_overdue_alerts():
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
    docs = db.collection("verified_records").where("final_recommendation", "==", "APPEAL").stream()
    overdue_appeals = []
    today = datetime.utcnow().date()
    
    for doc in docs:
        data = doc.to_dict()
        if data.get("is_rejected"):
            continue
        deadline_date_str = data.get("deadline_date")
        if not deadline_date_str or deadline_date_str == "N/A":
            continue
        try:
            deadline = datetime.strptime(deadline_date_str, "%d-%m-%Y").date()
        except ValueError:
            try:
                deadline = datetime.fromisoformat(deadline_date_str[:10]).date()
            except:
                continue
        days_remaining = (deadline - today).days
        if days_remaining < 0:
            overdue_appeals.append({
                "judgment_id": data.get("judgment_id"),
                "case_number": data.get("case_details", {}).get("case_number", "N/A"),
                "deadline_date": deadline_date_str,
                "days_overdue": abs(days_remaining),
                "alert_level": "CRITICAL",
                "responsible_department": data.get("case_details", {}).get("department", "N/A"),
                "action_items": data.get("action_items", [])
            })
            
    return {
        "total_overdue": len(overdue_appeals),
        "overdue_appeals": overdue_appeals
    }

@router.get("/summary")
async def get_alerts_summary():
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
    docs = db.collection("verified_records").stream()
    critical_count = 0
    urgent_count = 0
    warning_count = 0
    overdue_count = 0
    next_deadline = None
    today = datetime.utcnow().date()
    
    for doc in docs:
        data = doc.to_dict()
        if data.get("is_rejected"):
            continue
        deadline_date_str = data.get("deadline_date")
        if not deadline_date_str or deadline_date_str == "N/A":
            continue
        try:
            deadline = datetime.strptime(deadline_date_str, "%d-%m-%Y").date()
        except ValueError:
            try:
                deadline = datetime.fromisoformat(deadline_date_str[:10]).date()
            except:
                continue
        days_remaining = (deadline - today).days
        
        if days_remaining < 0:
            overdue_count += 1
        elif days_remaining <= 3:
            critical_count += 1
        elif days_remaining <= 7:
            urgent_count += 1
        elif days_remaining <= 14:
            warning_count += 1
            
        if days_remaining >= 0:
            if not next_deadline or days_remaining < next_deadline["days_remaining"]:
                next_deadline = {
                    "case_number": data.get("case_details", {}).get("case_number", "N/A"),
                    "days_remaining": days_remaining,
                    "judgment_id": data.get("judgment_id")
                }
                
    return {
        "has_critical": critical_count > 0,
        "critical_count": critical_count,
        "urgent_count": urgent_count,
        "warning_count": warning_count,
        "overdue_count": overdue_count,
        "next_deadline": next_deadline
    }

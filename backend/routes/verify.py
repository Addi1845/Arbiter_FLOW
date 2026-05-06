from fastapi import APIRouter, HTTPException, Body, Request
from firebase_config import db
from models.schemas import VerifyRequest, VerificationRecord
from datetime import datetime
from typing import Optional, List
import json

router = APIRouter(prefix="/verify", tags=["verify"])

from limiter import limiter

@router.get("/pending")
@limiter.limit("60/minute")
async def get_pending_verifications(request: Request):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        docs = db.collection("judgments")\
                 .where("agent_status", "==", "completed")\
                 .where("verification_status", "==", "pending")\
                 .order_by("created_at", direction="ASCENDING")\
                 .limit(50).stream()
                 
        items = []
        high_count = 0
        medium_count = 0
        low_count = 0
        
        for doc in docs:
            judgment = doc.to_dict()
            judgment_id = judgment.get("judgment_id")
            
            agent_doc = db.collection("agent_outputs").document(judgment_id).get()
            ext_doc = db.collection("extractions").document(judgment_id).get()
            
            if not agent_doc.exists or not ext_doc.exists:
                continue
                
            agent_output = agent_doc.to_dict()
            extraction = ext_doc.to_dict()
            
            priority = agent_output.get("priority", "LOW")
            if priority == "HIGH":
                high_count += 1
            elif priority == "MEDIUM":
                medium_count += 1
            else:
                low_count += 1
                
            items.append({
                "judgment_id": judgment_id,
                "filename": judgment.get("filename"),
                "storage_url": judgment.get("storage_url"),
                "created_at": judgment.get("created_at"),
                "case_number": extraction.get("case_number"),
                "court_name": extraction.get("court_name"),
                "date_of_order": extraction.get("date_of_order"),
                "petitioner": extraction.get("petitioner"),
                "respondent": extraction.get("respondent"),
                "subject_matter": extraction.get("subject_matter"),
                "department": extraction.get("department_hint"),
                "final_recommendation": agent_output.get("final_recommendation"),
                "final_confidence": agent_output.get("final_confidence"),
                "priority": priority,
                "deadline_date": agent_output.get("deadline_date"),
                "total_directives": extraction.get("total_directives", 0),
                "flagged_directives": extraction.get("flagged_count", 0),
                "has_low_confidence": extraction.get("flagged_count", 0) > 0,
                "debate_agreed": agent_output.get("debate_summary", {}).get("agreement", False),
                "action_items_count": len(agent_output.get("action_items", []))
            })
            
        def sort_key(x):
            prio_map = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
            return (prio_map.get(x["priority"], 3), x["created_at"])
            
        sorted_items = sorted(items, key=sort_key)
        
        return {
            "total_pending": len(sorted_items),
            "high_priority": high_count,
            "medium_priority": medium_count,
            "low_priority": low_count,
            "items": sorted_items
        }
    except Exception as e:
        print(f"Error getting pending list: {e}")
        raise HTTPException(status_code=500, detail="Failed to get pending list")

@router.get("/{judgment_id}/detail")
async def get_verification_detail(judgment_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        judg_doc = db.collection("judgments").document(judgment_id).get()
        if not judg_doc.exists:
            raise HTTPException(status_code=404, detail="Judgment document missing")
            
        ext_doc = db.collection("extractions").document(judgment_id).get()
        if not ext_doc.exists:
            raise HTTPException(status_code=404, detail="Extraction document missing")
            
        agent_doc = db.collection("agent_outputs").document(judgment_id).get()
        if not agent_doc.exists:
            raise HTTPException(status_code=404, detail="Agent output document missing")
            
        judgment = judg_doc.to_dict()
        extraction = ext_doc.to_dict()
        agent = agent_doc.to_dict()

        synthesis = agent.get("synthesis", {}) or {}
        research  = agent.get("research",  {}) or {}
        counter   = agent.get("counter",   {}) or {}
        debate_summary = agent.get("debate_summary", {}) or {}

        return {
            "judgment_id": judgment_id,
            "document_info": {
                "filename":      judgment.get("filename", ""),
                "storage_url":   judgment.get("storage_url", ""),
                "total_pages":   judgment.get("total_pages", 0),
                "digital_pages": judgment.get("digital_pages", 0),
                "ocr_pages":     judgment.get("ocr_pages", 0),
                "uploaded_at":   judgment.get("created_at", "")
            },
            "case_details": {
                "case_number":        extraction.get("case_number", ""),
                "court_name":         extraction.get("court_name", ""),
                "bench":              extraction.get("bench", ""),
                "date_of_order":      extraction.get("date_of_order", ""),
                "petitioner":         extraction.get("petitioner", ""),
                "respondent":         extraction.get("respondent", ""),
                "subject_matter":     extraction.get("subject_matter", ""),
                "department":         extraction.get("department_hint", ""),
                "overall_confidence": extraction.get("overall_confidence", 0) or 0
            },
            "directives": extraction.get("directives", []) or [],
            "timelines":  extraction.get("timelines",  []) or [],
            "flags": {
                "appeal_mentioned":     extraction.get("appeal_mentioned",     False),
                "compliance_mentioned": extraction.get("compliance_mentioned", False),
                "penalty_mentioned":    extraction.get("penalty_mentioned",    False)
            },
            "ai_recommendation": {
                "final_recommendation":   agent.get("final_recommendation",   synthesis.get("final_recommendation",  "")),
                "final_confidence":       agent.get("final_confidence",       synthesis.get("final_confidence",       0)) or 0,
                "decision_reasoning":     synthesis.get("decision_reasoning",    ""),
                "final_verdict_summary":  synthesis.get("final_verdict_summary", ""),
                "deadline_date":          agent.get("deadline_date",          synthesis.get("deadline_date", "")),
                "responsible_department": agent.get("responsible_department", synthesis.get("responsible_department", "")),
                "priority":               agent.get("priority",    synthesis.get("priority",    "LOW")),
                "risk_level":             synthesis.get("risk_level", "LOW"),
                "action_items":           agent.get("action_items", synthesis.get("action_items", [])) or []
            },
            "debate": {
                "research": {
                    "recommendation": research.get("recommendation", ""),
                    "confidence":     research.get("confidence",     0) or 0,
                    "reasoning":      research.get("primary_reasoning", ""),
                    "key_points":     research.get("key_points",     []) or [],
                    "summary":        research.get("research_summary", "")
                },
                "counter": {
                    "recommendation":   counter.get("counter_recommendation",     ""),
                    "confidence":       counter.get("counter_confidence",         0) or 0,
                    "reasoning":        counter.get("primary_counter_reasoning",  ""),
                    "weaknesses_found": counter.get("weaknesses_in_research",     []) or [],
                    "counter_points":   counter.get("counter_key_points",         []) or [],
                    "summary":          counter.get("counter_summary",            "")
                },
                "agents_agreed":    debate_summary.get("agreement", False),
                "comply_arguments": synthesis.get("comply_arguments", []) or [],
                "appeal_arguments": synthesis.get("appeal_arguments", []) or []
            },
            "verification_status": judgment.get("verification_status", "pending")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting detail: {e}")
        raise HTTPException(status_code=500, detail="Failed to get detail view")

@router.post("/{judgment_id}/approve")
async def approve_judgment(judgment_id: str, request: dict = Body(...)):
    verified_by = request.get("verified_by", "").strip()
    notes = request.get("notes", "")
    
    if not verified_by:
        raise HTTPException(status_code=400, detail="verified_by is required")
        
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        judg_doc = db.collection("judgments").document(judgment_id).get()
        if not judg_doc.exists:
            raise HTTPException(status_code=404, detail="Judgment not found")
            
        judgment = judg_doc.to_dict()
        
        if judgment.get("agent_status") != "completed":
            raise HTTPException(status_code=400, detail="Agents must be completed before verification")
            
        status = judgment.get("verification_status")
        if status != "pending":
            raise HTTPException(status_code=400, detail=f"This judgment has already been verified with decision: {status}")
            
        ext_doc = db.collection("extractions").document(judgment_id).get()
        agent_doc = db.collection("agent_outputs").document(judgment_id).get()
        
        if not ext_doc.exists or not agent_doc.exists:
            raise HTTPException(status_code=400, detail="Missing extraction or agent data")
            
        extraction = ext_doc.to_dict()
        agent = agent_doc.to_dict()
        synthesis = agent.get("synthesis", {})
        
        verified_at = datetime.utcnow().isoformat()
        
        verified_record = {
            "judgment_id": judgment_id,
            "verification_type": "approved",
            "verified_by": verified_by,
            "verified_at": verified_at,
            "notes": notes,
            "case_details": {
                "case_number": extraction.get("case_number"),
                "court_name": extraction.get("court_name"),
                "date_of_order": extraction.get("date_of_order"),
                "petitioner": extraction.get("petitioner"),
                "respondent": extraction.get("respondent"),
                "subject_matter": extraction.get("subject_matter"),
                "department": extraction.get("department_hint")
            },
            "final_recommendation": agent.get("final_recommendation"),
            "final_confidence": agent.get("final_confidence"),
            "decision_reasoning": synthesis.get("decision_reasoning"),
            "final_verdict_summary": synthesis.get("final_verdict_summary"),
            "deadline_date": agent.get("deadline_date"),
            "responsible_department": agent.get("responsible_department"),
            "priority": agent.get("priority"),
            "risk_level": synthesis.get("risk_level"),
            "action_items": agent.get("action_items", []),
            "comply_arguments": synthesis.get("comply_arguments", []),
            "appeal_arguments": synthesis.get("appeal_arguments", []),
            "is_edited": False,
            "original_ai_data_used": True,
            "storage_url": judgment.get("storage_url"),
            "filename": judgment.get("filename")
        }
        
        db.collection("verified_records").document(judgment_id).set(verified_record)
        
        db.collection("judgments").document(judgment_id).update({
            "verification_status": "approved",
            "verified_by": verified_by,
            "verified_at": verified_at
        })
        
        return {
            "judgment_id": judgment_id,
            "message": "Judgment approved and moved to dashboard",
            "decision": "approved",
            "verified_by": verified_by,
            "verified_at": verified_at,
            "final_recommendation": agent.get("final_recommendation"),
            "priority": agent.get("priority"),
            "deadline_date": agent.get("deadline_date")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error approving: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve judgment")

@router.post("/{judgment_id}/edit")
async def edit_judgment(judgment_id: str, request: dict = Body(...)):
    verified_by = request.get("verified_by", "").strip()
    notes = request.get("notes", "")
    edited_data = request.get("edited_data", {})
    
    if not verified_by:
        raise HTTPException(status_code=400, detail="verified_by is required")
        
    if not edited_data:
        raise HTTPException(status_code=400, detail="edited_data is required")
        
    valid_recs = ["COMPLY", "APPEAL", "ESCALATE"]
    edited_rec = edited_data.get("final_recommendation")
    if edited_rec not in valid_recs:
        raise HTTPException(status_code=400, detail="Invalid recommendation value")
        
    valid_priorities = ["HIGH", "MEDIUM", "LOW"]
    edited_pri = edited_data.get("priority")
    if edited_pri not in valid_priorities:
        raise HTTPException(status_code=400, detail="Invalid priority value")
        
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        judg_doc = db.collection("judgments").document(judgment_id).get()
        if not judg_doc.exists:
            raise HTTPException(status_code=404, detail="Judgment not found")
            
        judgment = judg_doc.to_dict()
        if judgment.get("verification_status") != "pending":
            raise HTTPException(status_code=400, detail="Judgment is not pending verification")
            
        ext_doc = db.collection("extractions").document(judgment_id).get()
        agent_doc = db.collection("agent_outputs").document(judgment_id).get()
        
        extraction = ext_doc.to_dict()
        agent = agent_doc.to_dict()
        synthesis = agent.get("synthesis", {})
        
        change_log = []
        
        if edited_rec != agent.get("final_recommendation"):
            change_log.append({
                "field": "final_recommendation",
                "ai_value": agent.get("final_recommendation"),
                "human_value": edited_rec
            })
            
        if edited_pri != agent.get("priority"):
            change_log.append({
                "field": "priority",
                "ai_value": agent.get("priority"),
                "human_value": edited_pri
            })
            
        if edited_data.get("deadline_date") != agent.get("deadline_date"):
            change_log.append({
                "field": "deadline_date",
                "ai_value": agent.get("deadline_date"),
                "human_value": edited_data.get("deadline_date")
            })
            
        if edited_data.get("responsible_department") != agent.get("responsible_department"):
            change_log.append({
                "field": "responsible_department",
                "ai_value": agent.get("responsible_department"),
                "human_value": edited_data.get("responsible_department")
            })
            
        verified_at = datetime.utcnow().isoformat()
        
        verified_record = {
            "judgment_id": judgment_id,
            "verification_type": "edited",
            "verified_by": verified_by,
            "verified_at": verified_at,
            "notes": notes,
            "case_details": {
                "case_number": extraction.get("case_number"),
                "court_name": extraction.get("court_name"),
                "date_of_order": extraction.get("date_of_order"),
                "petitioner": extraction.get("petitioner"),
                "respondent": extraction.get("respondent"),
                "subject_matter": extraction.get("subject_matter"),
                "department": extraction.get("department_hint")
            },
            "final_recommendation": edited_rec,
            "final_confidence": agent.get("final_confidence"),
            "decision_reasoning": edited_data.get("decision_reasoning", synthesis.get("decision_reasoning")),
            "final_verdict_summary": synthesis.get("final_verdict_summary"),
            "deadline_date": edited_data.get("deadline_date", agent.get("deadline_date")),
            "responsible_department": edited_data.get("responsible_department", agent.get("responsible_department")),
            "priority": edited_pri,
            "risk_level": edited_data.get("risk_level", synthesis.get("risk_level")),
            "action_items": edited_data.get("action_items", agent.get("action_items", [])),
            "comply_arguments": synthesis.get("comply_arguments", []),
            "appeal_arguments": synthesis.get("appeal_arguments", []),
            "is_edited": True,
            "original_ai_data_used": False,
            "change_log": change_log,
            "original_ai_recommendation": agent.get("final_recommendation"),
            "original_ai_priority": agent.get("priority"),
            "reviewer_notes": notes,
            "storage_url": judgment.get("storage_url"),
            "filename": judgment.get("filename")
        }
        
        db.collection("verified_records").document(judgment_id).set(verified_record)
        
        db.collection("judgments").document(judgment_id).update({
            "verification_status": "edited",
            "verified_by": verified_by,
            "verified_at": verified_at,
            "human_overrode_recommendation": len(change_log) > 0
        })
        
        return {
            "judgment_id": judgment_id,
            "message": "Edited version verified and moved to dashboard",
            "decision": "edited",
            "verified_by": verified_by,
            "changes_made": len(change_log),
            "change_log": change_log,
            "final_recommendation": edited_rec,
            "priority": edited_pri
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error editing: {e}")
        raise HTTPException(status_code=500, detail="Failed to edit judgment")

@router.post("/{judgment_id}/reject")
async def reject_judgment(judgment_id: str, request: dict = Body(...)):
    verified_by = request.get("verified_by", "").strip()
    rejection_reason = request.get("rejection_reason", "").strip()
    rejection_category = request.get("rejection_category", "").strip()
    
    if not verified_by:
        raise HTTPException(status_code=400, detail="verified_by is required")
        
    if len(rejection_reason) < 10:
        raise HTTPException(status_code=400, detail="Please provide a detailed rejection reason")
        
    valid_categories = ["WRONG_DOCUMENT", "POOR_EXTRACTION", "AGENT_ERROR", "OTHER"]
    if rejection_category not in valid_categories:
        raise HTTPException(status_code=400, detail="Invalid rejection_category")
        
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        judg_doc = db.collection("judgments").document(judgment_id).get()
        if not judg_doc.exists:
            raise HTTPException(status_code=404, detail="Judgment not found")
            
        judgment = judg_doc.to_dict()
        verified_at = datetime.utcnow().isoformat()
        
        db.collection("judgments").document(judgment_id).update({
            "verification_status": "rejected",
            "verified_by": verified_by,
            "verified_at": verified_at,
            "rejection_reason": rejection_reason,
            "rejection_category": rejection_category
        })
        
        rejection_record = {
            "judgment_id": judgment_id,
            "verification_type": "rejected",
            "verified_by": verified_by,
            "verified_at": verified_at,
            "rejection_reason": rejection_reason,
            "rejection_category": rejection_category,
            "filename": judgment.get("filename"),
            "is_rejected": True
        }
        
        db.collection("verified_records").document(judgment_id).set(rejection_record)
        
        return {
            "judgment_id": judgment_id,
            "message": "Judgment rejected and excluded from dashboard",
            "decision": "rejected",
            "verified_by": verified_by,
            "rejection_reason": rejection_reason
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error rejecting: {e}")
        raise HTTPException(status_code=500, detail="Failed to reject judgment")

@router.get("/verified")
async def get_verified_list(department: Optional[str] = None, priority: Optional[str] = None, recommendation: Optional[str] = None, limit: int = 50):
    if limit > 100:
        limit = 100
        
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        print(f"[VERIFY] Fetching verified records...")
        query = db.collection("verified_records")
        docs = query.order_by("verified_at", direction="DESCENDING").stream()

        all_records = []
        for doc in docs:
            d = doc.to_dict()
            print(f"[VERIFY] Found record: {d.get('judgment_id')} — is_rejected: {d.get('is_rejected')}")
            all_records.append(d)

        print(f"[VERIFY] Total records in collection: {len(all_records)}")

        items = []
        comply_count = 0
        appeal_count = 0
        escalate_count = 0
        edited_count = 0

        for record in all_records:
            if record.get("is_rejected") == True:
                continue

            dep = (
                record.get("case_details", {}).get("department", "")
                or record.get("department", "")
                or record.get("responsible_department", "")
            )
            if department and department.lower() not in dep.lower():
                continue

            pri = record.get("priority", "MEDIUM")
            if priority and priority != pri:
                continue

            rec = record.get("final_recommendation", "")
            if recommendation and recommendation != rec:
                continue

            if rec == "COMPLY":
                comply_count += 1
            elif rec == "APPEAL":
                appeal_count += 1
            elif rec == "ESCALATE":
                escalate_count += 1

            if record.get("is_edited"):
                edited_count += 1

            items.append({
                "judgment_id": record.get("judgment_id", ""),
                "filename": record.get("filename", ""),
                "case_number": record.get("case_details", {}).get("case_number", "") or record.get("case_number", ""),
                "court_name": record.get("case_details", {}).get("court_name", "") or record.get("court_name", ""),
                "date_of_order": record.get("case_details", {}).get("date_of_order", "") or record.get("date_of_order", ""),
                "department": dep,
                "recommendation": rec,
                "final_recommendation": rec,
                "priority": pri,
                "deadline_date": record.get("deadline_date", ""),
                "deadline": record.get("deadline_date", ""),
                "responsible_department": record.get("responsible_department", ""),
                "action_items": record.get("action_items", []),
                "action_items_count": len(record.get("action_items", [])),
                "verified_by": record.get("verified_by", ""),
                "verified_at": record.get("verified_at", ""),
                "is_edited": record.get("is_edited", False),
                "verification_type": record.get("verification_type", "approved")
            })

            if len(items) >= limit:
                break

        print(f"[VERIFY] Non-rejected records returned: {len(items)}")
                
        return {
            "total": len(items),
            "total_verified": len(items),
            "comply_count": comply_count,
            "appeal_count": appeal_count,
            "escalate_count": escalate_count,
            "edited_count": edited_count,
            "human_edited_count": edited_count,
            "records": items,
            "items": items,
            "metrics": {
                "total_verified": len(items),
                "comply_count": comply_count,
                "appeal_count": appeal_count,
                "escalate_count": escalate_count,
                "human_edited_count": edited_count
            },
            "departments": list(set(i["department"] for i in items if i.get("department")))
        }
    except Exception as e:
        print(f"Error getting verified list: {e}")
        raise HTTPException(status_code=500, detail="Failed to get verified list")

@router.get("/{judgment_id}/audit")
async def get_audit_trail(judgment_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        judg_doc = db.collection("judgments").document(judgment_id).get()
        if not judg_doc.exists:
            raise HTTPException(status_code=404, detail="Judgment not found")
            
        judgment = judg_doc.to_dict()
        
        ext_doc = db.collection("extractions").document(judgment_id).get()
        extraction = ext_doc.to_dict() if ext_doc.exists else {}
        
        agent_doc = db.collection("agent_outputs").document(judgment_id).get()
        agent = agent_doc.to_dict() if agent_doc.exists else {}
        
        ver_doc = db.collection("verified_records").document(judgment_id).get()
        verified = ver_doc.to_dict() if ver_doc.exists else {}
        
        audit_trail = []
        
        # Stage 1: Upload
        created_at = judgment.get("created_at")
        audit_trail.append({
            "stage": "UPLOADED",
            "timestamp": created_at,
            "details": f"PDF uploaded, {judgment.get('total_pages', '?')} pages parsed"
        })
        
        # Stage 2: Extraction
        extracted_at = judgment.get("extracted_at")
        audit_trail.append({
            "stage": "EXTRACTED",
            "timestamp": extracted_at or "pending",
            "details": f"AI extracted {extraction.get('total_directives', '?')} directives with {extraction.get('overall_confidence', '?')} confidence"
        })
        
        # Stage 3: Agents
        agents_at = judgment.get("agent_completed_at")
        research_rec = agent.get("research", {}).get("recommendation", "?")
        counter_rec = agent.get("counter", {}).get("counter_recommendation", "?")
        final_rec = agent.get("final_recommendation", "?")
        
        audit_trail.append({
            "stage": "AGENTS_COMPLETED",
            "timestamp": agents_at or "pending",
            "details": f"Research: {research_rec}, Counter: {counter_rec}, Final: {final_rec}"
        })
        
        # Stage 4: Verification
        verified_at = judgment.get("verified_at")
        ver_type = verified.get("verification_type", "PENDING_REVIEW").upper()
        
        if ver_type == "REJECTED":
            details = f"Rejected by {judgment.get('verified_by')} - Reason: {judgment.get('rejection_reason')}"
        elif ver_type == "EDITED":
            changes = verified.get('change_log', [])
            details = f"Edited by {judgment.get('verified_by')} - {len(changes)} changes made"
        elif ver_type == "APPROVED":
            details = f"Approved as-is by {judgment.get('verified_by')}"
        else:
            details = "Awaiting human review"
            
        audit_trail.append({
            "stage": ver_type,
            "timestamp": verified_at or "pending",
            "details": details
        })
        
        total_time = None
        if created_at and verified_at:
            try:
                start = datetime.fromisoformat(created_at)
                end = datetime.fromisoformat(verified_at)
                diff = end - start
                total_time = round(diff.total_seconds() / 3600, 2)
            except Exception:
                pass
                
        return {
            "judgment_id": judgment_id,
            "audit_trail": audit_trail,
            "current_status": judgment.get("verification_status", "pending"),
            "total_time_hours": total_time
        }
    except Exception as e:
        print(f"Error getting audit trail: {e}")
        raise HTTPException(status_code=500, detail="Failed to get audit trail")

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from firebase_config import db
from services.agents.research_agent import run_research
from services.agents.counter_agent import run_counter
from services.agents.synthesis_agent import run_synthesis
from services.extractor import get_extraction
from datetime import datetime
import json

# This route handles initiating the multi-agent workflow for reasoning
router = APIRouter(prefix="/agents", tags=["agents"])

def run_full_pipeline(judgment_id: str):
    if not db:
        print("[PIPELINE ERROR] Firestore not initialized")
        return
        
    try:
        # Step 1 — Update status to "running"
        db.collection("judgments").document(judgment_id).update({
            "agent_status": "running",
            "agent_started_at": datetime.utcnow().isoformat()
        })
        
        # Step 2 — Get extraction data
        try:
            extraction = get_extraction(judgment_id)
        except Exception as e:
            raise ValueError(f"Cannot run agents - extraction not complete: {e}")

        if extraction.get("extraction_status") == "invalid_document":
            db.collection("judgments").document(judgment_id).update({
                "agent_status": "skipped",
                "agent_error": "Invalid document — not a court judgment"
            })
            print(f"[PIPELINE] Skipping agents for {judgment_id} — invalid document")
            return

        if extraction.get("extraction_status") != "completed":
            raise ValueError("Cannot run agents - extraction not complete")
            
        # Step 3 — Run Research Agent
        print(f"[PIPELINE] Running Research Agent for {judgment_id}")
        research = run_research(extraction)
        
        # Step 4 — Run Counter Agent
        print(f"[PIPELINE] Running Counter Agent for {judgment_id}")
        counter = run_counter(extraction, research)
        
        # Step 5 — Run Synthesis Agent
        print(f"[PIPELINE] Running Synthesis Agent for {judgment_id}")
        synthesis = run_synthesis(extraction, research, counter)
        
        # Step 6 — Build complete agent_output document
        agent_output = {
            "judgment_id": judgment_id,
            "research": research,
            "counter": counter,
            "synthesis": synthesis,
            "final_recommendation": synthesis.get("final_recommendation"),
            "final_confidence": synthesis.get("final_confidence"),
            "deadline_date": synthesis.get("deadline_date"),
            "responsible_department": synthesis.get("responsible_department"),
            "priority": synthesis.get("priority"),
            "action_items": synthesis.get("action_items", []),
            "debate_summary": synthesis.get("debate_summary", {}),
            "agent_status": "completed",
            "completed_at": datetime.utcnow().isoformat()
        }
        
        # Step 7 — Save to Firestore agent_outputs collection
        db.collection("agent_outputs").document(judgment_id).set(agent_output)
        
        # Step 8 — Update judgments collection
        db.collection("judgments").document(judgment_id).update({
            "agent_status": "completed",
            "final_recommendation": synthesis.get("final_recommendation"),
            "priority": synthesis.get("priority"),
            "deadline_date": synthesis.get("deadline_date"),
            "agent_completed_at": datetime.utcnow().isoformat()
        })
        print(f"[PIPELINE] Completed full multi-agent workflow for {judgment_id}")
        
    except Exception as e:
        if db:
            db.collection("judgments").document(judgment_id).update({
                "agent_status": "failed",
                "agent_error": str(e),
                "agent_failed_at": datetime.utcnow().isoformat()
            })
        print(f"[PIPELINE ERROR] {judgment_id}: {e}")
        raise

from limiter import limiter

@router.post("/run/{judgment_id}")
@limiter.limit("10/minute")
async def start_agents_pipeline(request: Request, judgment_id: str, background_tasks: BackgroundTasks):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        # Step 1 — Check judgment exists and extraction complete
        doc_ref = db.collection("judgments").document(judgment_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Judgment not found")
            
        data = doc.to_dict()
        extraction_status = data.get("extraction_status")
        if extraction_status != "completed":
            raise HTTPException(
                status_code=400, 
                detail=f"Extraction must be completed before running agents. Current status: {extraction_status}"
            )
            
        # Step 2 — Check if agents already ran
        agent_status = data.get("agent_status")
        if agent_status == "completed":
            return {
                "judgment_id": judgment_id,
                "message": "Agents already completed",
                "agent_status": "completed",
                "final_recommendation": data.get("final_recommendation")
            }
            
        # Step 3 — Check if already running
        if agent_status == "running":
            return {
                "judgment_id": judgment_id,
                "message": "Agents already running",
                "agent_status": "running"
            }
            
        # Step 4 — Start background pipeline
        background_tasks.add_task(run_full_pipeline, judgment_id)
        return {
            "judgment_id": judgment_id,
            "message": "Agent pipeline started",
            "agent_status": "running",
            "pipeline": ["Research Agent", "Counter Agent", "Synthesis Agent"],
            "started_at": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error starting pipeline: {e}")
        raise HTTPException(status_code=500, detail="Failed to start agent pipeline")

@router.get("/{judgment_id}")
async def get_agent_output(judgment_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        doc = db.collection("agent_outputs").document(judgment_id).get()
        if doc.exists:
            return doc.to_dict()
            
        # Check judgments for status
        judg_doc = db.collection("judgments").document(judgment_id).get()
        if judg_doc.exists:
            return {
                "judgment_id": judgment_id,
                "agent_status": judg_doc.to_dict().get("agent_status", "pending"),
                "message": "Agents have not completed yet"
            }
            
        raise HTTPException(status_code=404, detail="Agent output not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting agent output: {e}")
        raise HTTPException(status_code=500, detail="Failed to get agent output")

@router.get("/{judgment_id}/recommendation")
async def get_agent_recommendation(judgment_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        doc = db.collection("agent_outputs").document(judgment_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Agent output not found")
            
        data = doc.to_dict()
        synthesis = data.get("synthesis", {})
        research = data.get("research", {})
        counter = data.get("counter", {})
        
        return {
            "judgment_id": judgment_id,
            "final_recommendation": synthesis.get("final_recommendation"),
            "final_confidence": synthesis.get("final_confidence"),
            "decision_reasoning": synthesis.get("decision_reasoning"),
            "deadline_date": synthesis.get("deadline_date"),
            "priority": synthesis.get("priority"),
            "responsible_department": synthesis.get("responsible_department"),
            "action_items": synthesis.get("action_items", []),
            "final_verdict_summary": synthesis.get("final_verdict_summary"),
            "debate_summary": data.get("debate_summary", {}),
            "research_recommendation": research.get("recommendation"),
            "counter_recommendation": counter.get("counter_recommendation"),
            "comply_arguments": synthesis.get("comply_arguments", []),
            "appeal_arguments": synthesis.get("appeal_arguments", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting recommendation: {e}")
        raise HTTPException(status_code=500, detail="Failed to get agent recommendation")

@router.get("/{judgment_id}/debate")
async def get_agent_debate(judgment_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not initialized")
        
    try:
        doc = db.collection("agent_outputs").document(judgment_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Agent output not found")
            
        data = doc.to_dict()
        research = data.get("research", {})
        counter = data.get("counter", {})
        synthesis = data.get("synthesis", {})
        debate_summary = data.get("debate_summary", {})
        
        return {
            "judgment_id": judgment_id,
            "research_case": {
                "recommendation": research.get("recommendation"),
                "confidence": research.get("confidence"),
                "reasoning": research.get("primary_reasoning"),
                "key_points": research.get("key_points", []),
                "summary": research.get("research_summary")
            },
            "counter_case": {
                "counter_recommendation": counter.get("counter_recommendation"),
                "confidence": counter.get("counter_confidence"),
                "reasoning": counter.get("primary_counter_reasoning"),
                "weaknesses_found": counter.get("weaknesses_in_research", []),
                "counter_points": counter.get("counter_key_points", []),
                "summary": counter.get("counter_summary")
            },
            "final_verdict": {
                "recommendation": synthesis.get("final_recommendation"),
                "confidence": synthesis.get("final_confidence"),
                "reasoning": synthesis.get("decision_reasoning"),
                "summary": synthesis.get("final_verdict_summary")
            },
            "agreement_between_agents": debate_summary.get("agreement")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting debate: {e}")
        raise HTTPException(status_code=500, detail="Failed to get agent debate")


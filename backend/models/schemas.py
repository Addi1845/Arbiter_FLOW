from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class JudgmentUploadResponse(BaseModel):
    judgment_id: str
    filename: str
    storage_url: str
    status: str
    created_at: str

class Directive(BaseModel):
    clause: str
    confidence: float

class Timeline(BaseModel):
    description: str
    date: str
    is_inferred: bool

class ExtractionResult(BaseModel):
    judgment_id: str
    case_number: str
    court_name: str
    date_of_order: str
    petitioner: str
    respondent: str
    directives: List[Directive]
    timelines: List[Timeline]
    subject_matter: str
    department_hint: str
    extraction_status: str  # values: "pending", "completed", "failed"
    created_at: str

class ActionItem(BaseModel):
    action: str
    owner: str
    due_date: str

class AgentOutput(BaseModel):
    judgment_id: str
    research_recommendation: str
    research_reasoning: str
    research_key_points: List[str]
    counter_recommendation: str
    counter_reasoning: str
    counter_risks: List[str]
    final_recommendation: str  # "COMPLY", "APPEAL", "ESCALATE"
    final_reasoning: str
    comply_arguments: List[str]
    appeal_arguments: List[str]
    deadline_date: str
    responsible_department: str
    priority: str  # "HIGH", "MEDIUM", "LOW"
    action_items: List[ActionItem]
    agent_status: str  # "pending", "running", "completed", "failed"
    created_at: str

class VerificationRecord(BaseModel):
    judgment_id: str
    verified_by: str
    decision: str  # "approved", "edited", "rejected"
    edited_data: Optional[Dict[str, Any]] = None
    rejection_reason: Optional[str] = None
    verified_at: str

class VerifyRequest(BaseModel):
    verified_by: str
    decision: str
    edited_data: Optional[Dict[str, Any]] = None
    rejection_reason: Optional[str] = None

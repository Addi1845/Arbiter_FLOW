from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse
import re
from firebase_config import db
from services.pdf_parser import parse_pdf
from models.schemas import JudgmentUploadResponse
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

from limiter import limiter

# This route handles uploading PDF judgment files to storage
router = APIRouter(prefix="/upload", tags=["upload"])

def sanitize_filename(filename: str) -> str:
    name, ext = os.path.splitext(filename)
    name = re.sub(r'[^a-zA-Z0-9_\-]', '_', name)
    name = name[:50]
    return f"{name}{ext}"

@router.post("/pdf", response_model=JudgmentUploadResponse)
@limiter.limit("10/minute")
async def upload_pdf(request: Request, file: UploadFile = File(...)):
    print(f"Received request to upload file: {file.filename}")
    
    if file is None:
        raise HTTPException(status_code=400, detail="File must not be None")
        
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
        
    file_bytes = await file.read()
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must not exceed 50MB")

    # Step 1: Generate unique judgment_id
    judgment_id = "JF-" + str(uuid.uuid4())[:8].upper()
    print(f"Generated judgment_id: {judgment_id}")

    # Step 2: Save PDF to local filesystem
    upload_dir = os.path.join("uploads", judgment_id)
    os.makedirs(upload_dir, exist_ok=True)
    local_path = os.path.join(upload_dir, file.filename)

    try:
        print(f"Saving PDF locally to {local_path}...")
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        # URL accessible via FastAPI's StaticFiles mount
        backend_host = os.getenv("BACKEND_HOST", "http://localhost:8000")
        storage_url = f"{backend_host}/uploads/{judgment_id}/{file.filename}"
        print(f"Saved locally: {storage_url}")
    except Exception as e:
        print(f"Local save error: {e}")
        storage_url = ""  # non-fatal, continue

    # Step 3: Run PDF parser
    print("Running PDF parser...")
    try:
        parsed = parse_pdf(file_bytes)
    except Exception as e:
        print(f"Parse error: {e}")
        raise HTTPException(status_code=422, detail="PDF could not be parsed. File may be corrupted.")

    created_at = datetime.utcnow().isoformat()

    # Step 4: Save to Firestore judgments collection
    doc = {
        "judgment_id": judgment_id,
        "filename": file.filename,
        "storage_url": storage_url,
        "local_path": local_path,
        "total_pages": parsed["total_pages"],
        "digital_pages": parsed["digital_pages"],
        "ocr_pages": parsed["ocr_pages"],
        "empty_pages": parsed["empty_pages"],
        "full_text": parsed["full_text"],
        "pages": parsed["pages"],
        "parsed_at": parsed["parsed_at"],
        "status": "uploaded",
        "extraction_status": "pending",
        "agent_status": "pending",
        "verification_status": "pending",
        "created_at": created_at
    }

    if db:
        try:
            print("Saving judgment record to Firestore...")
            db.collection("judgments").document(judgment_id).set(doc)
            print("Saved successfully.")
        except Exception as e:
            print(f"Firestore write error: {e}")
            raise HTTPException(status_code=500, detail="Failed to save judgment record")
    else:
        print("Firestore not initialized. Skipping actual db write.")

    # Step 5: Return JudgmentUploadResponse
    return JudgmentUploadResponse(
        judgment_id=judgment_id,
        filename=file.filename,
        storage_url=storage_url,
        status="uploaded",
        created_at=created_at
    )

@router.get("/status/{judgment_id}")
async def get_judgment_status(judgment_id: str):
    print(f"Fetching status for: {judgment_id}")
    if not db:
        # Mock response if DB not initialized
        return {
            "judgment_id": judgment_id,
            "filename": "mock.pdf",
            "status": "uploaded",
            "extraction_status": "pending",
            "agent_status": "pending",
            "verification_status": "pending",
            "total_pages": 1,
            "created_at": datetime.utcnow().isoformat()
        }

    try:
        doc_ref = db.collection("judgments").document(judgment_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Judgment not found")
            
        data = doc.to_dict()
        return {
            "judgment_id": data.get("judgment_id"),
            "filename": data.get("filename"),
            "status": data.get("status"),
            "extraction_status": data.get("extraction_status"),
            "agent_status": data.get("agent_status"),
            "verification_status": data.get("verification_status"),
            "total_pages": data.get("total_pages"),
            "created_at": data.get("created_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching status: {e}")
        raise HTTPException(status_code=500, detail="Error fetching judgment status")

@router.get("/list")
async def list_judgments():
    print("Listing latest judgments...")
    if not db:
        # Mock response if DB not initialized
        return []

    try:
        docs = db.collection("judgments").order_by("created_at", direction="DESCENDING").limit(20).stream()
        results = []
        for doc in docs:
            data = doc.to_dict()
            results.append({
                "judgment_id": data.get("judgment_id"),
                "filename": data.get("filename"),
                "status": data.get("status"),
                "extraction_status": data.get("extraction_status"),
                "agent_status": data.get("agent_status"),
                "verification_status": data.get("verification_status"),
                "created_at": data.get("created_at")
            })
        return results
    except Exception as e:
        print(f"Error listing judgments: {e}")
        raise HTTPException(status_code=500, detail="Error listing judgments")

@router.get("/serve/{judgment_id}")
async def serve_pdf(judgment_id: str):
    """Serve a locally stored PDF by judgment_id."""
    upload_dir = os.path.join("uploads", judgment_id)
    if not os.path.isdir(upload_dir):
        raise HTTPException(status_code=404, detail="PDF not found")

    # Find the first PDF file in the judgment folder
    matches = [f for f in os.listdir(upload_dir) if f.endswith(".pdf")]
    if not matches:
        raise HTTPException(status_code=404, detail="PDF file not found")

    file_path = os.path.join(upload_dir, matches[0])
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=matches[0]
    )

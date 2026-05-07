from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from routes import upload, extract, agents, verify, alerts, analytics
import os
import time
import logging
from datetime import datetime
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("judgeflow")

# Ensure local uploads dir exists
os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="JudgeFlow AI")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = os.getenv("ALLOWED_ORIGINS", "https://arbiter-flow.vercel.app,https://arbiter-flow-m1sy.vercel.app,http://localhost:3000,http://localhost:5173,http://localhost:80").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = (time.time() - start) * 1000
    logger.info(
        f"{request.method} {request.url.path} "
        f"→ {response.status_code} ({duration:.0f}ms)"
    )
    return response

# Serve uploaded PDFs as static files at /uploads/...
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(upload.router)
app.include_router(extract.router)
app.include_router(agents.router)
app.include_router(verify.router)
app.include_router(alerts.router)
app.include_router(analytics.router)

@app.get("/")
def health_check():
    from firebase_config import db
    firestore_status = "connected"
    if not db:
        firestore_status = "error"
    else:
        try:
            db.collection("judgments").limit(1).get()
        except Exception:
            firestore_status = "error"
            
    storage_status = "error" if firestore_status == "error" else "connected"
    anthropic_configured = "configured" if os.getenv("ANTHROPIC_API_KEY") else "missing"
    
    return {
        "status": "healthy" if firestore_status == "connected" else "degraded",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "firestore": firestore_status,
            "storage": storage_status,
            "anthropic": anthropic_configured
        },
        "uptime_check": "ok"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": True, "message": str(exc), "status_code": 500}
    )

# JudgeFlow AI
An AI-powered system for analyzing legal judgments and generating actionable compliance plans.

## Tech Stack
- FastAPI (Backend)
- React (Frontend)
- Firebase (Firestore & Storage)
- Anthropic Claude / LangChain / LangGraph (AI Agents)
- PyMuPDF / Tesseract (PDF parsing)

## Installation
```bash
cd backend
pip install -r requirements.txt
```

## Running the Application
```bash
cd backend
uvicorn main:app --reload
```

## Environment Variables
The `.env` file should contain the following configurations:
- `ANTHROPIC_API_KEY`: API key for Claude integration
- `FIREBASE_CREDENTIALS`: Path to the Firebase service account JSON key
- `STORAGE_BUCKET`: Firebase storage bucket name
- `ALLOWED_ORIGINS`: CORS allowed origins (e.g., http://localhost:3000)

## Firestore Collections Overview
- **judgments**: Raw PDF metadata + storage URL
- **extractions**: AI extracted structured data per judgment
- **agent_outputs**: Multi-agent reasoning results per judgment
- **verified_records**: Human approved final action plans

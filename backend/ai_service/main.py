from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

from matcher import match_candidate_to_job_hybrid, match_candidate_to_job
from skills import extract_skills
from collaborative import record_feedback, get_store_stats

app = FastAPI(title="SkillSyncer AI Service — Hybrid Recommendation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────────────────────────────────────

class ExtractSkillsRequest(BaseModel):
    text: str

class MatchRequest(BaseModel):
    resume_text: str
    job_description: str
    # Optional fields for the full hybrid engine
    candidate_skills: Optional[List[str]] = None
    internship_id: Optional[str] = None
    candidate_prefs: Optional[Dict[str, str]] = None  # e.g. {"location": "Remote", "domain": "AI"}
    job_data: Optional[Dict[str, str]] = None          # e.g. {"title": "...", "location": "...", "domain": "..."}

class FeedbackRequest(BaseModel):
    candidate_skills: List[str]
    internship_id: str
    action: str  # 'apply' | 'bookmark' | 'view' | 'interview'

# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

from accuracy import get_current_accuracy

@app.get("/accuracy")
async def api_get_accuracy():
    """Returns the current globally tracked match accuracy of the AI engine."""
    return get_current_accuracy()

@app.get("/health")
async def health_check():
    stats = get_store_stats()
    return {
        "status": "healthy",
        "service": "SkillSyncer AI — Hybrid Engine",
        "collaborative_store": stats
    }

@app.post("/extract-skills")
async def api_extract_skills(req: ExtractSkillsRequest):
    skills = extract_skills(req.text)
    return {"skills": skills}

@app.post("/match")
async def api_match(req: MatchRequest):
    """
    Full hybrid match endpoint.
    Computes R(c,j) = α·CBF + β·CF + γ·KG + δ·Pref
    Returns all component scores and the final weighted score.
    """
    scores = match_candidate_to_job_hybrid(
        resume_text=req.resume_text,
        job_description=req.job_description,
        candidate_skills=req.candidate_skills,
        internship_id=req.internship_id,
        candidate_prefs=req.candidate_prefs,
        job_data=req.job_data
    )
    return scores

@app.post("/feedback")
async def api_feedback(req: FeedbackRequest):
    """
    Records a user interaction to improve collaborative filtering.
    Actions: 'apply', 'bookmark', 'view', 'interview'
    """
    record_feedback(req.candidate_skills, req.internship_id, req.action)
    return {"status": "ok", "message": f"Feedback '{req.action}' recorded for internship {req.internship_id}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

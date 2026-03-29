"""
matcher.py — Hybrid Recommendation Engine

Implements the full scoring formula from the seminar paper:
R(c,j) = α·Sim_CBF(c,j) + β·Sim_CF(c,j) + γ·Sim_KG(c,j) + δ·Pref(c,j)

Where:
  Sim_CBF → Content-Based Filtering: cosine similarity of sentence embeddings
  Sim_CF  → Collaborative Filtering: patterns from similar candidates
  Sim_KG  → Knowledge Graph: inferred skills via ontology traversal
  Pref    → User Preference: location/domain match
  α=0.45  β=0.15  γ=0.25  δ=0.15
"""

from sklearn.metrics.pairwise import cosine_similarity
from model import get_embeddings
from skills import extract_skills
from utils import clean_text
from knowledge_graph import compute_kg_score, expand_skills
from collaborative import compute_cf_score
from accuracy import record_match_accuracy

# ─────────────────────────────────────────────────────────────────────────────
# Weights for the hybrid formula (must sum to 1.0)
# ─────────────────────────────────────────────────────────────────────────────
ALPHA = 0.45   # Content-Based Filtering (semantic embeddings)
BETA  = 0.15   # Collaborative Filtering
GAMMA = 0.25   # Knowledge Graph skill inference
DELTA = 0.15   # User preference (location / domain)


# ─────────────────────────────────────────────────────────────────────────────
# Component 1: Content-Based Filtering (Semantic Cosine Similarity)
# ─────────────────────────────────────────────────────────────────────────────
def compute_cbf_score(resume_text: str, job_description: str) -> float:
    """
    Converts both texts into 384-dim sentence embeddings and computes
    cosine similarity. Returns a value in [0, 1].
    """
    embeddings = get_embeddings([clean_text(resume_text), clean_text(job_description)])
    emb_np = embeddings.cpu().detach().numpy()
    similarity = cosine_similarity([emb_np[0]], [emb_np[1]])[0][0]
    return float(max(0.0, similarity))


# ─────────────────────────────────────────────────────────────────────────────
# Component 2: Knowledge Graph Score
# ─────────────────────────────────────────────────────────────────────────────
def compute_kg_component(resume_text: str, job_description: str) -> float:
    """
    Extracts skills then expands them via the knowledge graph.
    Returns the overlap ratio of expanded candidate skills vs job skills.
    """
    resume_skills = extract_skills(resume_text)
    job_skills    = extract_skills(job_description)
    return compute_kg_score(resume_skills, job_skills)


# ─────────────────────────────────────────────────────────────────────────────
# Component 3: User Preference Score
# ─────────────────────────────────────────────────────────────────────────────
def compute_preference_score(candidate_prefs: dict, job_data: dict) -> float:
    """
    Scores how well a job matches the candidate's stated preferences.

    candidate_prefs example:
      { "location": "Remote", "domain": "machine learning" }

    job_data example:
      { "location": "Remote", "domain": "AI / ML", "title": "ML Intern" }

    Scoring:
      - Exact location match: +50 points
      - Domain mentioned in title or description: +50 points
    """
    score = 0.0
    
    pref_location = (candidate_prefs.get("location") or "").lower().strip()
    job_location  = (job_data.get("location") or "").lower().strip()
    
    # 1. Location Match (Worth up to 0.3)
    # We still use exact/substring match for cities since they are categorical
    if pref_location and job_location:
        if pref_location in job_location or job_location in pref_location:
            score += 0.3
        elif pref_location == "remote" and "remote" in job_location:
            score += 0.3
    else:
        # If no location preference is set, assume flexible and give baseline
        score += 0.2

    # 2. Domain / Bio Semantic Match (Worth up to 0.7)
    pref_domain = str(candidate_prefs.get("domain") or "").strip()
    if pref_domain:
        job_text = " ".join([
            str(job_data.get("title", "")), 
            str(job_data.get("domain", "")), 
            str(job_data.get("description", ""))
        ]).strip()
        
        if job_text:
            # Semantic AI similarity! No hardcoded values.
            from skills import doc_similarity
            domain_sim = doc_similarity(pref_domain, job_text)
            # Ensure safe bounds
            domain_sim = max(0.0, min(1.0, float(domain_sim)))
            score += (domain_sim * 0.7)
        else:
            score += 0.3 # Fallback
    else:
        # If no bio/domain is set by the user, provide a neutral baseline
        score += 0.5

    return min(1.0, score)


# ─────────────────────────────────────────────────────────────────────────────
# Master Hybrid Scoring Function
# ─────────────────────────────────────────────────────────────────────────────
def match_candidate_to_job_hybrid(
    resume_text: str,
    job_description: str,
    candidate_skills: list = None,
    internship_id: str = None,
    candidate_prefs: dict = None,
    job_data: dict = None
) -> dict:
    """
    Computes the full hybrid recommendation score for a candidate-internship pair.

    Returns a dict with all component scores plus the final weighted score.
    All scores are expressed as percentages (0–100).
    """
    if not resume_text.strip() or not job_description.strip():
        return {
            "cbf_score": 0.0,
            "cf_score": 0.0,
            "kg_score": 0.0,
            "pref_score": 0.0,
            "semantic_score": 0.0,
            "skill_score": 0.0,
            "final_score": 0.0
        }

    candidate_skills = candidate_skills or extract_skills(resume_text)
    candidate_prefs  = candidate_prefs  or {}
    job_data         = job_data         or {}
    job_skills       = extract_skills(job_description)

    # ── Compute all 4 components ──────────────────────────────────────────────
    cbf   = compute_cbf_score(resume_text, job_description)
    cf    = compute_cf_score(candidate_skills, internship_id or "") if internship_id else 0.5
    kg    = compute_kg_score(candidate_skills, job_skills)
    pref  = compute_preference_score(candidate_prefs, job_data)

    # ── Paper formula: R = α·CBF + β·CF + γ·KG + δ·Pref ────────────────────
    final = ALPHA * cbf + BETA * cf + GAMMA * kg + DELTA * pref

    res = {
        "cbf_score":      round(cbf   * 100, 2),
        "cf_score":       round(cf    * 100, 2),
        "kg_score":       round(kg    * 100, 2),
        "pref_score":     round(pref  * 100, 2),
        # Legacy fields for frontend backward-compatibility
        "semantic_score": round(cbf   * 100, 2),
        "skill_score":    round(kg    * 100, 2),
        "final_score":    round(final * 100, 2),
        # Skill analysis data for UI
        "candidate_skills": candidate_skills,
        "job_skills": job_skills,
        "expanded_candidate_skills": list(expand_skills(candidate_skills))
    }

    # ── Terminal logging ──────────────────────────────────────────────────────
    print(f"\n{'='*50}")
    print(f"  Hybrid Match Evaluation -- {job_data.get('title', 'Internship')}")
    print(f"{'='*50}")
    print(f"  [a={ALPHA}] Content-Based (CBF):      {res['cbf_score']:>6}%")
    print(f"  [b={BETA}]  Collaborative (CF):        {res['cf_score']:>6}%")
    print(f"  [g={GAMMA}] Knowledge Graph (KG):      {res['kg_score']:>6}%")
    print(f"  [d={DELTA}] User Preference (Pref):    {res['pref_score']:>6}%")
    print(f"{'-'*50}")
    print(f"  Final Hybrid Score (R):               {res['final_score']:>6}%")
    print(f"{'='*50}")
    record_match_accuracy(cbf * 100, final * 100)

    return res


# ─────────────────────────────────────────────────────────────────────────────
# Legacy wrapper — keeps backward compatibility with old API calls
# ─────────────────────────────────────────────────────────────────────────────
def match_candidate_to_job(resume_text: str, job_description: str) -> dict:
    return match_candidate_to_job_hybrid(resume_text, job_description)

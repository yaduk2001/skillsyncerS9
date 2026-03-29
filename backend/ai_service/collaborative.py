"""
collaborative.py — Collaborative Filtering Engine

Implements a simple in-memory Collaborative Filtering system.
Tracks which internships students with similar skill fingerprints have applied to,
then uses that data to boost recommendations for similar new candidates.

This solves the "coldstart" problem partially — once enough candidates interact
with internships, the system learns from those patterns automatically.
"""

from collections import defaultdict
from typing import List

# ─────────────────────────────────────────────────────────────────────────────
# In-memory application store
# Key: frozenset of candidate's canonical skills (fingerprint)
# Value: dict mapping internship_id → count of applications
# ─────────────────────────────────────────────────────────────────────────────
application_store: dict = defaultdict(lambda: defaultdict(int))

# Feedback weight multipliers by action type
FEEDBACK_WEIGHTS = {
    "apply":     1.5,
    "bookmark":  1.0,
    "view":      0.5,
    "interview": 2.0,
}

def _skill_fingerprint(skills: List[str]) -> frozenset:
    """Creates a hashable fingerprint from a list of skills."""
    return frozenset(s.lower().strip() for s in skills if s.strip())


def record_feedback(candidate_skills: List[str], internship_id: str, action: str):
    """
    Records a feedback signal from a candidate interaction.
    
    Args:
        candidate_skills: List of canonical skills the candidate has
        internship_id:    ID of the internship acted upon
        action:           Type of action: 'apply', 'bookmark', 'view', 'interview'
    """
    weight = FEEDBACK_WEIGHTS.get(action, 0.5)
    fingerprint = _skill_fingerprint(candidate_skills)
    application_store[fingerprint][internship_id] += weight
    print(f"[CF] Recorded feedback: action={action}, weight={weight}, internship={internship_id}")


def compute_cf_score(candidate_skills: List[str], internship_id: str) -> float:
    """
    Computes a Collaborative Filtering score for a candidate-internship pair.
    
    Algorithm:
    1. Compute the candidate's skill fingerprint.
    2. Look for other stored fingerprints that have significant skill overlap (Jaccard similarity).
    3. Check if those similar candidates applied to the given internship.
    4. Score is a weighted sum of applications from similar candidates, normalized.
    
    Returns a score between 0.0 and 1.0.
    Falls back to 0.5 (neutral) if no similar candidates exist (cold start).
    """
    if not application_store:
        return 0.5  # Cold start — no data yet

    candidate_fp = _skill_fingerprint(candidate_skills)
    candidate_set = set(candidate_fp)

    weighted_score = 0.0
    total_weight = 0.0

    for stored_fp, internship_counts in application_store.items():
        stored_set = set(stored_fp)

        # Jaccard similarity between two skill fingerprints
        intersection = candidate_set & stored_set
        union = candidate_set | stored_set
        if not union:
            continue
        jaccard = len(intersection) / len(union)

        # Only consider sufficiently similar candidates (>30% overlap)
        if jaccard < 0.3:
            continue

        # Get application count for this specific internship
        count = internship_counts.get(internship_id, 0)
        weighted_score += jaccard * count
        total_weight += jaccard

    if total_weight == 0:
        return 0.5  # No similar candidates found

    # Normalize: cap at 1.0
    raw_score = weighted_score / (total_weight * 5)  # 5 = avg max interactions assumed
    return min(float(raw_score), 1.0)


def get_store_stats() -> dict:
    """Returns diagnostic info about the current collaborative store."""
    return {
        "unique_candidate_profiles": len(application_store),
        "total_internship_interactions": sum(
            sum(counts.values()) for counts in application_store.values()
        )
    }

"""
knowledge_graph.py — Skill Ontology / Knowledge Graph

Defines skill relationships using a directed graph. This allows the system to
infer implied skills. Example: if a student knows TensorFlow, the system can
infer they also likely know Python and Neural Networks — even if not stated.
"""

import networkx as nx

# Build directed skill knowledge graph
# Edge A → B means: "Knowing A implies knowledge of B"
SKILL_GRAPH = nx.DiGraph()

# ──────────────────────────────────────────────
# Frontend Domain
# ──────────────────────────────────────────────
SKILL_GRAPH.add_edge("react", "javascript")
SKILL_GRAPH.add_edge("angular", "javascript")
SKILL_GRAPH.add_edge("vue", "javascript")
SKILL_GRAPH.add_edge("nextjs", "react")
SKILL_GRAPH.add_edge("redux", "react")
SKILL_GRAPH.add_edge("tailwind", "css")
SKILL_GRAPH.add_edge("bootstrap", "css")
SKILL_GRAPH.add_edge("css", "html")

# ──────────────────────────────────────────────
# Backend / Frameworks
# ──────────────────────────────────────────────
SKILL_GRAPH.add_edge("django", "python")
SKILL_GRAPH.add_edge("flask", "python")
SKILL_GRAPH.add_edge("fastapi", "python")
SKILL_GRAPH.add_edge("spring", "java")
SKILL_GRAPH.add_edge("springboot", "java")
SKILL_GRAPH.add_edge("express", "javascript")
SKILL_GRAPH.add_edge("nodejs", "javascript")

# ──────────────────────────────────────────────
# Machine Learning / AI
# ──────────────────────────────────────────────
SKILL_GRAPH.add_edge("tensorflow", "python")
SKILL_GRAPH.add_edge("tensorflow", "neural networks")
SKILL_GRAPH.add_edge("pytorch", "python")
SKILL_GRAPH.add_edge("pytorch", "neural networks")
SKILL_GRAPH.add_edge("keras", "tensorflow")
SKILL_GRAPH.add_edge("neural networks", "machine learning")
SKILL_GRAPH.add_edge("deep learning", "machine learning")
SKILL_GRAPH.add_edge("deep learning", "neural networks")
SKILL_GRAPH.add_edge("nlp", "machine learning")
SKILL_GRAPH.add_edge("nlp", "python")
SKILL_GRAPH.add_edge("computer vision", "deep learning")
SKILL_GRAPH.add_edge("scikit-learn", "python")
SKILL_GRAPH.add_edge("scikit-learn", "machine learning")
SKILL_GRAPH.add_edge("pandas", "python")
SKILL_GRAPH.add_edge("numpy", "python")

# ──────────────────────────────────────────────
# Data Science
# ──────────────────────────────────────────────
SKILL_GRAPH.add_edge("data science", "python")
SKILL_GRAPH.add_edge("data science", "machine learning")
SKILL_GRAPH.add_edge("data analysis", "python")
SKILL_GRAPH.add_edge("data analysis", "sql")
SKILL_GRAPH.add_edge("tableau", "data analysis")
SKILL_GRAPH.add_edge("power bi", "data analysis")

# ──────────────────────────────────────────────
# Cloud / DevOps
# ──────────────────────────────────────────────
SKILL_GRAPH.add_edge("aws", "cloud")
SKILL_GRAPH.add_edge("gcp", "cloud")
SKILL_GRAPH.add_edge("azure", "cloud")
SKILL_GRAPH.add_edge("kubernetes", "docker")
SKILL_GRAPH.add_edge("docker", "linux")
SKILL_GRAPH.add_edge("devops", "linux")
SKILL_GRAPH.add_edge("devops", "docker")
SKILL_GRAPH.add_edge("ci/cd", "devops")

# ──────────────────────────────────────────────
# Databases
# ──────────────────────────────────────────────
SKILL_GRAPH.add_edge("postgresql", "sql")
SKILL_GRAPH.add_edge("mysql", "sql")
SKILL_GRAPH.add_edge("sqlite", "sql")
SKILL_GRAPH.add_edge("mongodb", "nosql")
SKILL_GRAPH.add_edge("redis", "nosql")

# ──────────────────────────────────────────────
# Systems / Low Level
# ──────────────────────────────────────────────
SKILL_GRAPH.add_edge("c++", "c")
SKILL_GRAPH.add_edge("rust", "systems programming")
SKILL_GRAPH.add_edge("embedded systems", "c")
SKILL_GRAPH.add_edge("embedded systems", "c++")

# Sibling clusters (bidirectional near-equivalents in same domain)
FRONTEND_FRAMEWORKS = ["react", "angular", "vue"]
ML_FRAMEWORKS = ["tensorflow", "pytorch", "keras"]
CLOUD_PROVIDERS = ["aws", "gcp", "azure"]
SQL_DATABASES = ["postgresql", "mysql", "sqlite"]

def _add_siblings(group):
    """Makes skills in a group weakly suggest each other (for KG expansion purposes only)."""
    for a in group:
        for b in group:
            if a != b:
                SKILL_GRAPH.add_edge(a, b, weight=0.5)  # low weight siblings

_add_siblings(FRONTEND_FRAMEWORKS)
_add_siblings(ML_FRAMEWORKS)
_add_siblings(CLOUD_PROVIDERS)
_add_siblings(SQL_DATABASES)


def expand_skills(skills: list, depth: int = 2) -> set:
    """
    Given a list of known skills, traverse the knowledge graph to find
    all implied/related skills up to `depth` hops away.

    Example: expand_skills(["tensorflow"])
    → {"tensorflow", "python", "neural networks", "machine learning"}
    """
    expanded = set(s.lower() for s in skills)
    for skill in list(expanded):
        if skill in SKILL_GRAPH:
            # BFS from this node, limited to `depth` levels
            for _node in nx.bfs_tree(SKILL_GRAPH, skill, depth_limit=depth).nodes():
                expanded.add(_node)
    return expanded


def get_skill_similarity(skill_a: str, skill_b: str) -> float:
    """
    Returns KG-based relatedness score between two skills (0.0 to 1.0).
    - Direct edge: 1.0
    - 2 hops: 0.6
    - 3 hops: 0.3
    - Not connected: 0.0
    """
    a = skill_a.lower()
    b = skill_b.lower()
    if a == b:
        return 1.0
    if not SKILL_GRAPH.has_node(a) or not SKILL_GRAPH.has_node(b):
        return 0.0
    try:
        path_len = nx.shortest_path_length(SKILL_GRAPH, a, b)
        if path_len == 1:
            return 1.0
        elif path_len == 2:
            return 0.6
        elif path_len == 3:
            return 0.3
        else:
            return 0.0
    except nx.NetworkXNoPath:
        return 0.0


def compute_kg_score(resume_skills: list, job_skills: list) -> float:
    """
    Computes a KG-aware skill match score.
    Steps:
    1. Expand the candidate's skills using the graph (infer implied skills)
    2. For each job skill, check if the expanded candidate skills contain it
    3. Score = matched / total job skills
    """
    if not job_skills:
        return 0.5  # No job skills to compare — neutral score

    candidate_expanded = expand_skills(resume_skills)
    job_skills_lower = set(s.lower() for s in job_skills)

    matched = candidate_expanded.intersection(job_skills_lower)
    score = len(matched) / len(job_skills_lower)

    return min(float(score), 1.0)

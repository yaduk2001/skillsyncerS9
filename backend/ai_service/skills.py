import spacy
from typing import List, Set
import re

# Try to load the spacy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading en_core_web_sm model...")
    import subprocess
    import sys
    subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")

# Predefined skill dictionary for normalization
SKILL_DICTIONARY = {
    "javascript": ["js", "es6", "javascript", "node.js", "nodejs", "react", "reactjs", "react.js", "angular", "vue"],
    "python": ["python", "python3", "django", "flask", "fastapi"],
    "java": ["java", "spring", "spring boot", "springboot"],
    "c++": ["cpp", "c++", "c plus plus"],
    "c#": ["c#", "csharp", ".net", "dotnet"],
    "machine learning": ["ml", "machine learning", "deep learning", "ai", "artificial intelligence", "nlp"],
    "data science": ["data analysis", "data science", "pandas", "numpy", "matplotlib", "scikit-learn"],
    "database": ["sql", "mysql", "postgresql", "mongodb", "nosql", "database", "oracle"],
    "cloud": ["aws", "azure", "gcp", "docker", "kubernetes", "cloud"],
    "frontend": ["html", "css", "html5", "css3", "bootstrap", "tailwind"],
    "communication": ["communication", "teamwork", "leadership", "agile", "scrum"]
}

# Reverse map for fast lookup
normalized_map = {}
for canonical, variants in SKILL_DICTIONARY.items():
    for variant in variants:
        normalized_map[variant.lower()] = canonical

def extract_skills(text: str) -> List[str]:
    """
    Extracts skills from text by matching against our predefined dictionary.
    Normalizes the returned skills.
    """
    if not text:
        return []
    
    doc = nlp(text.lower())
    extracted = set()
    
    # 1. Check individual tokens
    for token in doc:
        if token.text in normalized_map:
            extracted.add(normalized_map[token.text])
            
    # 2. Check for multi-word phrases simple matching
    text_lower = text.lower()
    for variant in normalized_map.keys():
        if variant in text_lower: # basic substring match for phrases like 'machine learning'
            if re.search(r'\b' + re.escape(variant) + r'\b', text_lower):
                extracted.add(normalized_map[variant])
                
    return list(extracted)

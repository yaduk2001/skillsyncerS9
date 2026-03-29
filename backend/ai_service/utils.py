import re

def clean_text(text: str) -> str:
    if not text:
        return ""
    # Remove special characters and extra whitespace
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s\.-]', ' ', text)
    return text.strip().lower()

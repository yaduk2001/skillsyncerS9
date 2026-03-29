import os
from sentence_transformers import SentenceTransformer

# Define local cache folder path relative to this script
cache_folder = os.path.join(os.path.dirname(__file__), 'models')

# Load a fast and accurate pretrained model for semantic similarity
# It will download to the 'models' folder on the first run, and load from it via subsequent runs
print("Loading sentence-transformer model...")
embedder = SentenceTransformer('all-MiniLM-L6-v2', cache_folder=cache_folder)
print(f"Model loaded successfully in {cache_folder}")

def get_embeddings(texts: list[str]):
    return embedder.encode(texts, convert_to_tensor=True)

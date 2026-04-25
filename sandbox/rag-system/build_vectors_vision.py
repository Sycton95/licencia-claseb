import json
import numpy as np
from openai import OpenAI

client = OpenAI(api_key="ollama", base_url="http://localhost:11434/v1")
EMBED_MODEL = "mxbai-embed-large"
CACHE_FILENAME = "vision_chunks_cache.json"
VECTOR_FILENAME = "vector_cache_vision.npy"
MAPPING_FILENAME = "vector_mapping_vision.json"

def get_embedding(text):
    text = text.replace("\n", " ")
    response = client.embeddings.create(model=EMBED_MODEL, input=[text])
    return response.data[0].embedding

def chunk_text_for_embedding(text, max_chars=1000):
    """Splits full page text into smaller blocks to bypass embedding token limits."""
    return [text[i:i+max_chars] for i in range(0, len(text), max_chars)]

if __name__ == "__main__":
    # Removed array slice to load full document
    with open(CACHE_FILENAME, 'r', encoding='utf-8') as f:
        kb_chunks = json.load(f)

    print(f"Computing Parent-Child embeddings for Vision Cache ({len(kb_chunks)} chunks)...")
    
    child_vectors = []
    parent_mapping = []

    for parent_idx, chunk in enumerate(kb_chunks):
        sub_texts = chunk_text_for_embedding(chunk["text"])
        
        for sub_text in sub_texts:
            try:
                vec = get_embedding(sub_text)
                child_vectors.append(vec)
                parent_mapping.append(parent_idx)
            except Exception as e:
                print(f"Error embedding sub-text from Parent {parent_idx}: {e}")

    np.save(VECTOR_FILENAME, np.array(child_vectors))
    
    with open(MAPPING_FILENAME, 'w', encoding='utf-8') as f:
        json.dump(parent_mapping, f)
        
    print(f"Saved {len(child_vectors)} child vectors to {VECTOR_FILENAME}.")
    print(f"Saved parent mapping to {MAPPING_FILENAME}.")
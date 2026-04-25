import os
import json
import base64
import fitz  # PyMuPDF
from openai import OpenAI

# Configuration
client = OpenAI(api_key="ollama", base_url="http://localhost:11434/v1")
VISION_MODEL = "qwen3-VL:4B-Instruct"
CACHE_FILENAME = "vision_chunks_cache.json"
PAGE_IMAGES_DIR = "rendered_pages"

# Content-only page ranges per chapter (1-indexed)
CHAPTER_RANGES = [
    (1, 6, 9), (2, 11, 31), (3, 33, 35), (4, 37, 66),
    (5, 68, 75), (6, 77, 107), (7, 109, 125), (8, 127, 134), (9, 136, 148)
]

def get_chapter_for_page(page_num):
    for chap, start, end in CHAPTER_RANGES:
        if start <= page_num <= end:
            return str(chap)
    return None

def transcribe_page_with_vlm(image_bytes):
    """Sends the entire page image to the VLM for layout-aware transcription."""
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    prompt = """
    Actúa como un transcriptor experto. Esta es una página entera de un manual de tránsito.
    Tu tarea es transcribir y explicar TODO el contenido de esta página de forma coherente en español:
    1. Transcribe todo el texto principal manteniendo el orden lógico.
    2. Si hay tablas, descríbelas claramente fila por fila.
    3. Si hay imágenes, señales de tránsito o diagramas, descríbelos detalladamente e intégralos en el texto explicando junto a qué concepto están ubicados.
    4. NO agregues comentarios interpretativos, conclusiones o resúmenes al final. Limítate a transcribir y describir lo que ves en la página.
    """
    try:
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                ]
            }],
            temperature=0.1
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Vision Model Error: {e}")
        return ""

def build_vision_cache(pdf_path):
    chunks = []
    
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Error opening PDF: {e}")
        return
        
    print(f"Building ColPali-inspired cache. Rendering pages to '{PAGE_IMAGES_DIR}/'...")
    zoom_matrix = fitz.Matrix(2, 2)

    for i in range(len(doc)):
        page_num = i + 1
        
        chapter_id = get_chapter_for_page(page_num)
        
        if not chapter_id:
            continue
            
        print(f"Rendering Page {page_num} (Chapter {chapter_id})...")
        page = doc.load_page(i)
        
        # Render and Save
        pix = page.get_pixmap(matrix=zoom_matrix, alpha=False)
        image_bytes = pix.tobytes("png")
        
        chapter_dir = os.path.join(PAGE_IMAGES_DIR, f"chapter_{chapter_id}")
        os.makedirs(chapter_dir, exist_ok=True)
        page_image_path = os.path.join(chapter_dir, f"full_page_{page_num}.png")
        pix.save(page_image_path)
        
        # VLM Transcription
        print(f" -> Sending full page to {VISION_MODEL}...")
        page_transcription = transcribe_page_with_vlm(image_bytes)
        
        if not page_transcription:
            print(" -> Warning: Transcription failed. Skipping page.")
            continue
            
        # Store as a single page-level chunk
        chunks.append({
            "chapter_id": chapter_id,
            "page": page_num,
            "text": page_transcription,
            "image_paths": [page_image_path]
        })
            
        # Progressive Save
        with open(CACHE_FILENAME, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, ensure_ascii=False, indent=4)
        print(f" -> Page {page_num} processed and saved.")

if __name__ == "__main__":
    pdf_filename = "manual.pdf" 
    build_vision_cache(pdf_filename)
    print("\nVision Cache Generation Complete.")
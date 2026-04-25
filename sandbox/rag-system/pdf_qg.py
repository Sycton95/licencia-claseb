import os
import json
import uuid
from openai import OpenAI

# Configuration
client = OpenAI(api_key="ollama", base_url="http://localhost:11434/v1")
GENERATOR_MODEL = "qwen3:4B-Instruct" # Or qwen2.5:3b-instruct depending on your local VRAM preference
CACHE_FILENAME = "vision_chunks_cache.json"
QUIZ_BANK_FILENAME = "quiz_bank.json"

def generate_question(chunk):
    """
    Passes the context chunk to the LLM to generate a multiple-choice question.
    Enforces a strict JSON schema and injects programmatic metadata natively.
    """
    context_text = chunk.get("text", "")
    chapter_id = chunk.get("chapter_id", "unknown")
    page_num = chunk.get("page", 0)
    image_paths = chunk.get("image_paths", [])

    system_prompt = """
    Eres un experto creador de exámenes de conducción. Tu tarea es leer el texto proporcionado y generar UNA (1) pregunta de opción múltiple basada estrictamente en ese contenido.
    
    DEBES responder ÚNICAMENTE con un objeto JSON válido que cumpla con la siguiente estructura exacta. No agregues texto fuera del JSON, ni bloques de código markdown (```json).
    
    Estructura JSON requerida:
    {
        "prompt": "¿[Pregunta clara y directa]?",
        "selectionMode": "single",
        "instruction": "Marque una respuesta.",
        "options": [
            {"text": "[Opción A]"},
            {"text": "[Opción B]"},
            {"text": "[Opción C]"},
            {"text": "[Opción D]"}
        ],
        "correctOptionIndexes": [0], 
        "publicExplanation": "[Explicación detallada de por qué es la respuesta correcta basada en el texto]",
        "groundingExcerpt": "[Copia exacta de la frase o párrafo del texto que justifica la respuesta]"
    }
    """

    user_prompt = f"Genera la pregunta basándote en este texto:\n\n{context_text}"

    try:
        response = client.chat.completions.create(
            model=GENERATOR_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2, # Low temperature for factual consistency and schema adherence
            response_format={"type": "json_object"} # Force JSON output mode in Ollama
        )
        
        raw_output = response.choices[0].message.content.strip()
        
        # Strip potential markdown artifacts if the model ignores the prompt instruction
        if raw_output.startswith("```json"):
            raw_output = raw_output[7:-3].strip()
            
        question_data = json.loads(raw_output)
        
        # Natively inject programmatic metadata to prevent hallucination
        question_data["externalId"] = f"chapter-{chapter_id}-q{uuid.uuid4().hex[:8]}"
        question_data["chapterId"] = f"chapter-{chapter_id}"
        question_data["sourcePageStart"] = page_num
        question_data["sourcePageEnd"] = page_num
        question_data["sourceReference"] = f"Pág. {page_num}, Capítulo {chapter_id}"
        
        if image_paths:
            question_data["visualReference"] = image_paths[0]
            
        return question_data

    except json.JSONDecodeError as e:
        print(f" -> JSON Error (Chapter {chapter_id}, Page {page_num}): Failed to parse LLM output. Skipping.")
        return None
    except Exception as e:
        print(f" -> Generation Error (Chapter {chapter_id}, Page {page_num}): {e}")
        return None

if __name__ == "__main__":
    if not os.path.exists(CACHE_FILENAME):
        print(f"Error: {CACHE_FILENAME} not found. Run build_cache_vision.py first.")
        exit(1)

    with open(CACHE_FILENAME, 'r', encoding='utf-8') as f:
        kb_chunks = json.load(f)

    quiz_bank = []
    
    # Load existing progress if restarting a failed/stopped batch
    if os.path.exists(QUIZ_BANK_FILENAME):
        with open(QUIZ_BANK_FILENAME, 'r', encoding='utf-8') as f:
            try:
                quiz_bank = json.load(f)
                print(f"Resuming existing batch. Loaded {len(quiz_bank)} questions.")
            except json.JSONDecodeError:
                print("Existing quiz_bank.json is corrupted. Starting fresh.")
    
    # Calculate starting index based on existing questions to allow pausing/resuming
    start_idx = len(quiz_bank)
    
    print(f"--- Generating Quiz Data from {len(kb_chunks)} chunks ---")
    
    for idx in range(start_idx, len(kb_chunks)):
        chunk = kb_chunks[idx]
        print(f"Processing chunk {idx + 1}/{len(kb_chunks)} (Chapter {chunk['chapter_id']}, Page {chunk.get('page', 'Unknown')})...")
        
        q = generate_question(chunk)
        if q:
            quiz_bank.append(q)
            
            # Progressive Save: Write to disk after every successful generation
            with open(QUIZ_BANK_FILENAME, 'w', encoding='utf-8') as out_f:
                json.dump(quiz_bank, out_f, ensure_ascii=False, indent=4)

    print("\nFull Question Generation Complete.")
import json
import os
import time
import uuid
from typing import Any

from openai import OpenAI

from build_manifest import build_manifest
from lib.pipeline_common import get_build_paths, load_json, retry_call, save_json, summarize_page_text, write_jsonl


OLLAMA_BASE_URL = "http://localhost:11434/v1"
GENERATOR_MODEL = "qwen3:4B-Instruct"
MAX_CANDIDATES_PER_UNIT = int(os.getenv("RAG_MAX_CANDIDATES_PER_UNIT", "2"))
GENERATION_SLEEP_SECONDS = float(os.getenv("RAG_GENERATION_SLEEP_SECONDS", "0.35"))

client = OpenAI(api_key="ollama", base_url=OLLAMA_BASE_URL)


def build_generation_prompt(unit: dict, variant_index: int) -> tuple[str, str]:
    mode = "visual" if unit["visualSupport"]["required"] else "text"
    system_prompt = f"""
Eres un generador experto de preguntas del examen de conducción.
Debes producir una pregunta rigurosa y 100% sustentada por el conocimiento entregado.

Reglas:
- Responde solo JSON válido.
- Usa 4 opciones salvo que el material justifique menos, pero nunca menos de 3.
- No repitas el enunciado literal del texto fuente.
- No uses "todas las anteriores" ni "ninguna de las anteriores".
- Si el conocimiento requiere soporte visual, genera una pregunta coherente con ese soporte.
- Variante solicitada: {variant_index + 1}.
"""
    user_prompt = f"""
Construye una pregunta basada en esta unidad de conocimiento:

Contexto general de la página: {unit.get('pageContextSummary', unit['canonicalStatement'])}

Título: {unit['topicTitle']}
Tipo: {unit['unitType']}
Modo visual: {mode}
Statement: {unit['canonicalStatement']}
Texto de soporte:
{unit['supportingText']}

Hints:
{json.dumps(unit['generatorHints'], ensure_ascii=False)}

Devuelve JSON con:
{{
  "prompt": "...",
  "instruction": "Marque una respuesta.",
  "selectionMode": "single",
  "options": [{{"text":"..."}}, ...],
  "correctOptionIndexes": [0],
  "publicExplanation": "...",
  "groundingExcerpt": "...",
  "generatorRationale": "..."
}}
"""
    return system_prompt, user_prompt


def normalize_candidate(raw_candidate: dict[str, Any], manifest: dict, unit: dict, variant_index: int) -> dict:
    options = raw_candidate.get("options", [])
    if options and isinstance(options[0], str):
        options = [{"text": option} for option in options]

    generation_mode = "visual" if unit["visualSupport"]["required"] else "text"
    if unit["visualSupport"]["required"] and unit["unitType"] == "scenario":
        generation_mode = "mixed"

    prompt = raw_candidate.get("prompt", "").strip()
    novelty_key = f"{unit['unitId']}::{variant_index + 1}::{prompt[:80].lower()}"
    duplicate_family_key = f"{unit['topicKey']}::{generation_mode}"

    return {
        "candidateId": f"candidate-{uuid.uuid4().hex[:12]}",
        "buildId": manifest["buildId"],
        "editionId": manifest["editionId"],
        "chapterId": unit["chapterId"],
        "sourceDocumentId": unit["sourceDocumentId"],
        "unitIds": [unit["unitId"]],
        "generationMode": generation_mode,
        "questionType": "multiple_choice" if raw_candidate.get("selectionMode") == "multiple" else "single_choice",
        "prompt": prompt,
        "instruction": raw_candidate.get("instruction", "Marque una respuesta.").strip(),
        "options": options,
        "correctOptionIndexes": raw_candidate.get("correctOptionIndexes", []),
        "publicExplanation": raw_candidate.get("publicExplanation", "").strip(),
        "groundingExcerpt": raw_candidate.get("groundingExcerpt", "").strip(),
        "groundingRefs": {
            "unitIds": [unit["unitId"]],
            "pageRange": unit["pageRange"],
            "blockIds": [span["blockId"] for span in unit["groundingSpans"]],
            "assetIds": unit["visualSupport"]["assetIds"],
        },
        "needsVisualAudit": unit["visualSupport"]["required"],
        "requiredMedia": {
            "assetIds": unit["visualSupport"]["assetIds"],
            "cropHints": [
                {
                    "assetId": asset_id,
                    "reason": "Visual support required by source unit.",
                }
                for asset_id in unit["visualSupport"]["assetIds"]
            ],
        },
        "generatorRationale": raw_candidate.get("generatorRationale", summarize_page_text(unit["canonicalStatement"])),
        "difficultyEstimate": unit["difficultyHints"]["estimatedLevel"],
        "noveltyKey": novelty_key,
        "duplicateFamilyKey": duplicate_family_key,
        "verifier": {
            "schemaPassed": False,
            "groundingPassed": False,
            "answerConsistencyPassed": False,
            "visualSupportPassed": False,
            "duplicateRisk": "unknown",
            "issues": [],
            "score": 0,
        },
        "status": "generated",
    }


def build_generation_failure_candidate(manifest: dict, unit: dict, variant_index: int, error: Exception) -> dict:
    return {
        "candidateId": f"candidate-{uuid.uuid4().hex[:12]}",
        "buildId": manifest["buildId"],
        "editionId": manifest["editionId"],
        "chapterId": unit["chapterId"],
        "sourceDocumentId": unit["sourceDocumentId"],
        "unitIds": [unit["unitId"]],
        "generationMode": "visual" if unit["visualSupport"]["required"] else "text",
        "questionType": "single_choice",
        "prompt": "",
        "instruction": "Marque una respuesta.",
        "options": [],
        "correctOptionIndexes": [],
        "publicExplanation": "",
        "groundingExcerpt": "",
        "groundingRefs": {
            "unitIds": [unit["unitId"]],
            "pageRange": unit["pageRange"],
            "blockIds": [span["blockId"] for span in unit["groundingSpans"]],
            "assetIds": unit["visualSupport"]["assetIds"],
        },
        "needsVisualAudit": unit["visualSupport"]["required"],
        "requiredMedia": {
            "assetIds": unit["visualSupport"]["assetIds"],
            "cropHints": [],
        },
        "generatorRationale": f"generation_failed:{type(error).__name__}",
        "difficultyEstimate": unit["difficultyHints"]["estimatedLevel"],
        "noveltyKey": f"{unit['unitId']}::{variant_index + 1}::generation-failed",
        "duplicateFamilyKey": f"{unit['topicKey']}::generation-failed",
        "verifier": {
            "schemaPassed": False,
            "groundingPassed": False,
            "answerConsistencyPassed": False,
            "visualSupportPassed": False,
            "duplicateRisk": "unknown",
            "issues": [
                {
                    "code": "generation_failed",
                    "severity": "critical",
                    "message": f"Generation failed with {type(error).__name__}.",
                }
            ],
            "score": 0,
        },
        "status": "rejected_pre_review",
    }


def generate_candidates_for_unit(manifest: dict, unit: dict, max_candidates: int = MAX_CANDIDATES_PER_UNIT) -> list[dict]:
    candidates = []
    for variant_index in range(max_candidates):
        system_prompt, user_prompt = build_generation_prompt(unit, variant_index)
        try:
            response = retry_call(
                lambda: client.chat.completions.create(
                    model=GENERATOR_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.45,
                    response_format={"type": "json_object"},
                ),
                attempts=3,
                sleep_seconds=2.0,
            )
            raw_content = response.choices[0].message.content.strip()
            if raw_content.startswith("```json"):
                raw_content = raw_content[7:-3].strip()
            raw_candidate = json.loads(raw_content)
            candidates.append(normalize_candidate(raw_candidate, manifest, unit, variant_index))
        except Exception as error:  # noqa: BLE001
            candidates.append(build_generation_failure_candidate(manifest, unit, variant_index, error))
        time.sleep(GENERATION_SLEEP_SECONDS)
    return candidates


def generate_candidates(manifest: dict) -> list[dict]:
    build_paths = get_build_paths(manifest["buildId"])
    units = load_json(build_paths.knowledge_units_path, default=[]) or []
    all_candidates = []

    for unit in units:
        target_count = min(MAX_CANDIDATES_PER_UNIT, max(1, unit["difficultyHints"]["questionTargets"]))
        unit_candidates = generate_candidates_for_unit(manifest, unit, max_candidates=target_count)
        all_candidates.extend(unit_candidates)
        save_json(build_paths.question_candidates_path, all_candidates)

    chapter_groups: dict[str, list[dict]] = {}
    for candidate in all_candidates:
        chapter_groups.setdefault(candidate["chapterId"], []).append(candidate)
    chapters = []
    for chapter_id, rows in sorted(chapter_groups.items()):
        file_path = build_paths.candidates_dir / f"{chapter_id}.jsonl"
        chapters.append({"chapterId": chapter_id, "file": str(file_path), "count": write_jsonl(file_path, rows)})
    save_json(
        build_paths.candidates_index_path,
        {"candidateCount": len(all_candidates), "chapters": chapters},
    )

    return all_candidates


if __name__ == "__main__":
    manifest = build_manifest()
    candidates = generate_candidates(manifest)
    print(f"Generated {len(candidates)} candidates for {manifest['buildId']}.")

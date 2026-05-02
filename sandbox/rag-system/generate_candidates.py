import json
import os
import time
import uuid
from typing import Any

from openai import OpenAI

from build_manifest import build_manifest
from lib.pipeline_common import get_build_paths, load_json, retry_call, save_json, summarize_page_text, write_jsonl
from lib.run_iteration import candidate_canonical_view, enrich_candidate_iteration_fields, hybrid_similarity


OLLAMA_BASE_URL = "http://localhost:11434/v1"
MAX_CANDIDATES_PER_UNIT = int(os.getenv("RAG_MAX_CANDIDATES_PER_UNIT", "2"))
GENERATION_SLEEP_SECONDS = float(os.getenv("RAG_GENERATION_SLEEP_SECONDS", "0.35"))
MAX_VARIANT_SIMILARITY = float(os.getenv("RAG_MAX_VARIANT_SIMILARITY", "0.8"))

client = OpenAI(api_key="ollama", base_url=OLLAMA_BASE_URL)


def normalize_text(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def supports_applied_variant(unit: dict) -> bool:
    if unit.get("visualDependency") != "none":
        return True
    if unit.get("unitType") in {"scenario", "principle", "rule", "procedure", "warning"}:
        return True
    support_text = f" {normalize_text(unit.get('supportingText', ''))} "
    return any(
        marker in support_text
        for marker in (
            " si ",
            " cuando ",
            " en caso ",
            " debe ",
            " pueden ",
            " por que ",
            " por qué ",
        )
    )


def choose_variant_strategy(unit: dict, variant_index: int, max_candidates: int) -> str:
    if max_candidates <= 1 or variant_index == 0:
        if unit.get("visualDependency") == "required":
            return "visual_identification"
        return "direct_grounded"
    if supports_applied_variant(unit):
        return "applied_grounded"
    return "direct_precision"


def build_generation_prompt(unit: dict, variant_index: int, max_candidates: int) -> tuple[str, str, str]:
    mode = (
        "visual"
        if unit.get("visualDependency") == "required"
        else "mixed"
        if unit.get("visualDependency") == "linked"
        else "text"
    )
    variant_strategy = choose_variant_strategy(unit, variant_index, max_candidates)
    strategy_instruction = {
        "direct_grounded": "Formula una pregunta de comprension directa o recall preciso. La respuesta correcta debe quedar explicitamente sostenida por el grounding.",
        "applied_grounded": "Formula una pregunta aplicada solo si el escenario esta claramente autorizado por el grounding. No inventes detalles operativos especificos que no aparezcan en el texto fuente.",
        "direct_precision": "Formula una segunda pregunta distinta pero todavia directa. Cambia el foco conceptual, no solo el parafraseo del prompt.",
        "visual_identification": "Formula una pregunta de reconocimiento o interpretacion visual apoyada explicitamente por el material visual citado.",
    }[variant_strategy]
    system_prompt = f"""
Eres un generador experto de preguntas del examen de conduccion.
Debes producir una pregunta rigurosa y 100% sustentada por el conocimiento entregado.

Reglas:
- Responde solo JSON valido.
- Usa 4 opciones salvo que el material justifique menos, pero nunca menos de 3.
- No repitas el enunciado literal del texto fuente.
- No uses "todas las anteriores" ni "ninguna de las anteriores".
- Si el conocimiento requiere soporte visual, genera una pregunta coherente con ese soporte.
- No inventes sistemas, instrumentos, reglas operativas o efectos concretos que no esten explicitos en el grounding.
- Si la evidencia es general, manten la pregunta en un nivel general.
- Variante solicitada: {variant_index + 1}.
- Estrategia obligatoria: {variant_strategy}.
- Regla de estrategia: {strategy_instruction}
"""
    user_prompt = f"""
Construye una pregunta basada en esta unidad de conocimiento:

Contexto general de la pagina: {unit.get('pageContextSummary', unit['canonicalStatement'])}

Titulo: {unit['topicTitle']}
Tipo: {unit['unitType']}
Modo visual: {mode}
Statement: {unit['canonicalStatement']}
Texto de soporte:
{unit['supportingText']}

Hints:
{json.dumps(unit['generatorHints'], ensure_ascii=False)}

La variante debe ser materialmente distinta de otras variantes del mismo unitId. Si no puedes producir una segunda variante claramente distinta, entrega una variante mas precisa y menos ambiciosa, no un simple parafraseo.

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
    return system_prompt, user_prompt, variant_strategy


def normalize_candidate(
    raw_candidate: dict[str, Any],
    manifest: dict,
    unit: dict,
    variant_index: int,
    variant_strategy: str,
) -> dict:
    options = raw_candidate.get("options", [])
    if options and isinstance(options[0], str):
        options = [{"text": option} for option in options]

    visual_dependency = unit.get("visualDependency", "none")
    generation_mode = "visual" if visual_dependency == "required" else "mixed" if visual_dependency == "linked" else "text"

    prompt = raw_candidate.get("prompt", "").strip()
    novelty_key = f"{unit['unitId']}::{variant_index + 1}::{prompt[:80].lower()}"
    duplicate_family_key = f"{unit['topicKey']}::{generation_mode}"

    candidate = {
        "candidateId": f"candidate-{uuid.uuid4().hex[:12]}",
        "buildId": manifest["buildId"],
        "runId": manifest.get("runId", manifest["buildId"]),
        "sourceBuildId": manifest.get("sourceBuildId", manifest["buildId"]),
        "editionId": manifest["editionId"],
        "chapterId": unit["chapterId"],
        "sourceDocumentId": unit["sourceDocumentId"],
        "unitIds": [unit["unitId"]],
        "generationMode": generation_mode,
        "visualDependency": visual_dependency,
        "variantStrategy": variant_strategy,
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
        "needsVisualAudit": visual_dependency != "none",
        "requiredMedia": {
            "assetIds": unit["visualSupport"]["assetIds"],
            "cropHints": [
                {
                    "assetId": asset_id,
                    "reason": (
                        "Visual support required by source unit."
                        if visual_dependency == "required"
                        else "Visual support linked to the source unit."
                    ),
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
    return enrich_candidate_iteration_fields(candidate)


def build_generation_failure_candidate(
    manifest: dict,
    unit: dict,
    variant_index: int,
    variant_strategy: str,
    error: Exception,
) -> dict:
    visual_dependency = unit.get("visualDependency", "none")
    candidate = {
        "candidateId": f"candidate-{uuid.uuid4().hex[:12]}",
        "buildId": manifest["buildId"],
        "runId": manifest.get("runId", manifest["buildId"]),
        "sourceBuildId": manifest.get("sourceBuildId", manifest["buildId"]),
        "editionId": manifest["editionId"],
        "chapterId": unit["chapterId"],
        "sourceDocumentId": unit["sourceDocumentId"],
        "unitIds": [unit["unitId"]],
        "generationMode": "visual" if visual_dependency == "required" else "mixed" if visual_dependency == "linked" else "text",
        "visualDependency": visual_dependency,
        "variantStrategy": variant_strategy,
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
        "needsVisualAudit": visual_dependency != "none",
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
    return enrich_candidate_iteration_fields(candidate)


def dedupe_unit_variants(candidates: list[dict]) -> list[dict]:
    kept: list[dict] = []
    for candidate in candidates:
        if candidate["status"] != "generated":
            kept.append(candidate)
            continue
        candidate_view = candidate_canonical_view(candidate)
        duplicate_match = None
        for previous in kept:
            if previous["status"] != "generated":
                continue
            similarity = hybrid_similarity(candidate_view, candidate_canonical_view(previous))
            if candidate["candidateFingerprint"] == previous.get("candidateFingerprint") or similarity >= MAX_VARIANT_SIMILARITY:
                duplicate_match = (previous, similarity)
                break
        if duplicate_match:
            matched, similarity = duplicate_match
            candidate["status"] = "rejected_pre_review"
            candidate["verifier"]["issues"].append(
                {
                    "code": "within_unit_variant_overlap",
                    "severity": "warning",
                    "message": f"Variante demasiado parecida a {matched['candidateId']} dentro de la misma unidad (similitud {similarity:.2f}).",
                }
            )
        kept.append(candidate)
    return kept


def generate_candidates_for_unit(manifest: dict, unit: dict, max_candidates: int = MAX_CANDIDATES_PER_UNIT) -> list[dict]:
    candidates = []
    for variant_index in range(max_candidates):
        system_prompt, user_prompt, variant_strategy = build_generation_prompt(unit, variant_index, max_candidates)
        try:
            response = retry_call(
                lambda: client.chat.completions.create(
                    model=manifest["models"]["generatorModel"],
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
            candidates.append(normalize_candidate(raw_candidate, manifest, unit, variant_index, variant_strategy))
        except Exception as error:  # noqa: BLE001
            candidates.append(build_generation_failure_candidate(manifest, unit, variant_index, variant_strategy, error))
        time.sleep(GENERATION_SLEEP_SECONDS)
    return dedupe_unit_variants(candidates)


def generate_candidates(manifest: dict) -> list[dict]:
    build_paths = get_build_paths(manifest["buildId"])
    units = load_json(build_paths.knowledge_units_path, default=[]) or []
    all_candidates = []

    for unit in units:
        target_count = min(MAX_CANDIDATES_PER_UNIT, max(1, unit["difficultyHints"]["questionTargets"]))
        if target_count > 1 and not supports_applied_variant(unit):
            target_count = 1
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

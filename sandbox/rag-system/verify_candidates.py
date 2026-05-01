import json
import os
from collections import Counter, defaultdict

from openai import OpenAI

from build_manifest import build_manifest
from lib.pipeline_common import (
    get_build_paths,
    load_json,
    normalize_for_matching,
    retry_call,
    save_json,
    write_jsonl,
)


OLLAMA_BASE_URL = "http://localhost:11434/v1"
MAX_REQUIRED_MEDIA = 8
ENABLE_SEMANTIC_VERIFIER = os.getenv("RAG_ENABLE_SEMANTIC_VERIFIER", "0") == "1"

client = OpenAI(api_key="ollama", base_url=OLLAMA_BASE_URL)


def normalize_text(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def contains_bad_markup(value: str) -> bool:
    normalized = normalize_for_matching(value)
    return any(
        token in normalized
        for token in ("example.com", "image_placeholder", "```", "![", "[vis:")
    )


def build_provenance_indexes(manifest: dict) -> dict:
    paths = get_build_paths(manifest["buildId"])
    pages = load_json(paths.page_artifacts_path, default=[]) or []
    units = load_json(paths.knowledge_units_path, default=[]) or []
    asset_ids = set()
    blocks_by_page = defaultdict(set)
    pages_by_number = {}

    for page in pages:
        pages_by_number[page["pageNumber"]] = page
        for asset in page.get("visualAssets", []):
            if asset.get("assetId"):
                asset_ids.add(asset["assetId"])
        for block in page.get("ocrBlocks", []):
            blocks_by_page[page["pageId"]].add(block["blockId"])

    return {
        "assetIds": asset_ids,
        "unitIds": {unit["unitId"] for unit in units},
        "unitsById": {unit["unitId"]: unit for unit in units},
        "blocksByPage": blocks_by_page,
        "pagesByNumber": pages_by_number,
    }


def verify_candidate(candidate: dict, indexes: dict) -> tuple[list[dict], int, dict]:
    issues = []
    prompt = normalize_text(candidate.get("prompt", ""))
    options = candidate.get("options", [])
    explanation = normalize_text(candidate.get("publicExplanation", ""))
    grounding_excerpt = normalize_text(candidate.get("groundingExcerpt", ""))
    correct_indexes = candidate.get("correctOptionIndexes", [])
    option_texts = [normalize_text(option.get("text", "")) for option in options]
    grounding_refs = candidate.get("groundingRefs", {})
    required_media = candidate.get("requiredMedia", {})

    if not prompt:
        issues.append({"code": "empty_prompt", "severity": "critical", "message": "El prompt está vacío."})
    if len(options) < 3:
        issues.append({"code": "invalid_option_count", "severity": "critical", "message": "La candidata debe tener 3 o 4 opciones."})
    if any(not option_text for option_text in option_texts):
        issues.append({"code": "empty_option", "severity": "critical", "message": "Hay opciones vacías."})
    if not correct_indexes:
        issues.append({"code": "missing_correct_answer", "severity": "critical", "message": "Falta la respuesta correcta."})
    if any(index < 0 or index >= len(options) for index in correct_indexes):
        issues.append({"code": "correct_answer_out_of_range", "severity": "critical", "message": "Índice de respuesta correcta inválido."})
    if len(set(option_texts)) != len(option_texts):
        issues.append({"code": "duplicate_option_text", "severity": "critical", "message": "Hay distractores repetidos."})
    if not explanation:
        issues.append({"code": "missing_explanation", "severity": "warning", "message": "Falta explicación pública."})
    if not grounding_excerpt:
        issues.append({"code": "missing_grounding", "severity": "critical", "message": "Falta grounding excerpt."})
    if prompt and grounding_excerpt and grounding_excerpt in prompt:
        issues.append({"code": "prompt_leaks_grounding", "severity": "warning", "message": "El prompt parece copiar demasiado el grounding."})
    if any(token in prompt for token in ["todas las anteriores", "ninguna de las anteriores"]):
        issues.append({"code": "banned_option_pattern", "severity": "critical", "message": "La pregunta usa patrones de opción prohibidos."})
    if len(prompt) < 24:
        issues.append({"code": "prompt_too_short", "severity": "warning", "message": "El prompt es demasiado corto para una pregunta robusta."})
    if explanation and explanation == grounding_excerpt:
        issues.append({"code": "explanation_copies_grounding", "severity": "warning", "message": "La explicación copia el grounding sin aportar síntesis."})
    if len(option_texts) >= 3 and len(set(option_texts)) <= 2:
        issues.append({"code": "collapsed_distractors", "severity": "critical", "message": "Los distractores no son suficientemente distintos."})

    if any(contains_bad_markup(value) for value in [candidate.get("prompt", ""), candidate.get("publicExplanation", ""), candidate.get("groundingExcerpt", "")]):
        issues.append({"code": "fake_markup_in_candidate", "severity": "critical", "message": "La candidata contiene URLs falsas, placeholders o markup de extracción."})

    media_asset_ids = required_media.get("assetIds", [])
    if candidate.get("needsVisualAudit") and not media_asset_ids:
        issues.append({"code": "missing_visual_assets", "severity": "critical", "message": "La candidata visual no tiene assetIds."})
    if len(media_asset_ids) > MAX_REQUIRED_MEDIA:
        issues.append({"code": "excessive_required_media", "severity": "critical", "message": "La candidata referencia demasiados assets visuales."})
    unresolved_assets = [asset_id for asset_id in media_asset_ids if asset_id not in indexes["assetIds"]]
    if unresolved_assets:
        issues.append({"code": "unresolved_assets", "severity": "critical", "message": f"Assets no resueltos: {', '.join(unresolved_assets[:5])}."})

    unresolved_units = [unit_id for unit_id in candidate.get("unitIds", []) if unit_id not in indexes["unitIds"]]
    if unresolved_units:
        issues.append({"code": "unresolved_units", "severity": "critical", "message": f"Unidades no resueltas: {', '.join(unresolved_units[:5])}."})

    for unit_id in candidate.get("unitIds", []):
        unit = indexes["unitsById"].get(unit_id)
        if not unit:
            continue
        page_range = grounding_refs.get("pageRange") or {}
        if page_range and page_range != unit.get("pageRange"):
            issues.append({"code": "grounding_page_mismatch", "severity": "critical", "message": "La página de grounding no coincide con la unidad fuente."})
        for span in unit.get("groundingSpans", []):
            if span["blockId"] not in indexes["blocksByPage"].get(span["pageId"], set()):
                issues.append({"code": "unresolved_block", "severity": "critical", "message": f"Bloque no resuelto: {span['blockId']}."})

    critical_count = sum(1 for issue in issues if issue["severity"] == "critical")
    warning_count = sum(1 for issue in issues if issue["severity"] == "warning")
    score = max(0, 100 - (critical_count * 35) - (warning_count * 10))
    flags = {
        "schemaPassed": not any(issue["code"] in {"empty_prompt", "invalid_option_count", "empty_option"} for issue in issues),
        "groundingPassed": not any(issue["code"] in {"missing_grounding", "grounding_page_mismatch", "unresolved_units", "unresolved_block"} for issue in issues),
        "answerConsistencyPassed": not any(issue["code"] in {"missing_correct_answer", "correct_answer_out_of_range", "duplicate_option_text", "collapsed_distractors"} for issue in issues),
        "visualSupportPassed": not any(issue["code"] in {"missing_visual_assets", "unresolved_assets", "excessive_required_media"} for issue in issues),
    }
    return issues, score, flags


def semantic_llm_check(candidate: dict, manifest: dict) -> tuple[list[dict], int]:
    if not ENABLE_SEMANTIC_VERIFIER:
        return [], 0

    correct_texts = [
        candidate["options"][index]["text"]
        for index in candidate.get("correctOptionIndexes", [])
        if 0 <= index < len(candidate.get("options", []))
    ]
    prompt = f"""
Evalúa esta candidata de examen de conducción. Responde solo JSON.

Pregunta: {candidate.get('prompt', '')}
Opciones: {json.dumps(candidate.get('options', []), ensure_ascii=False)}
Respuesta correcta: {json.dumps(correct_texts, ensure_ascii=False)}
Explicación: {candidate.get('publicExplanation', '')}
Grounding: {candidate.get('groundingExcerpt', '')}
Modo: {candidate.get('generationMode', '')}

Devuelve:
{{
  "groundingProvesAnswer": true,
  "answerUniquelyCorrect": true,
  "distractorsPlausible": true,
  "promptLeaksAnswer": false,
  "explanationMatchesGrounding": true,
  "visualNeedIsJustified": true,
  "issues": []
}}
"""
    try:
        response = retry_call(
            lambda: client.chat.completions.create(
                model=manifest["models"]["verifierModel"],
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
            ),
            attempts=2,
            sleep_seconds=1.5,
        )
        payload = json.loads(response.choices[0].message.content)
    except Exception:  # noqa: BLE001
        return [{"code": "semantic_verifier_unavailable", "severity": "warning", "message": "El verificador semántico no respondió."}], 10

    issues = []
    for key, code, message in [
        ("groundingProvesAnswer", "semantic_grounding_weak", "El grounding no prueba claramente la respuesta."),
        ("answerUniquelyCorrect", "semantic_answer_not_unique", "La respuesta correcta no parece única."),
        ("distractorsPlausible", "semantic_weak_distractors", "Los distractores no son plausibles."),
        ("explanationMatchesGrounding", "semantic_explanation_mismatch", "La explicación no coincide con el grounding."),
        ("visualNeedIsJustified", "semantic_visual_need_unjustified", "La necesidad visual no está justificada."),
    ]:
        if payload.get(key) is False:
            issues.append({"code": code, "severity": "warning", "message": message})
    if payload.get("promptLeaksAnswer") is True:
        issues.append({"code": "semantic_prompt_leaks_answer", "severity": "warning", "message": "El prompt entrega la respuesta."})
    return issues, len(issues) * 10


def write_candidate_jsonl(paths, candidates: list[dict]) -> dict:
    chapter_groups = defaultdict(list)
    rejected_groups = defaultdict(list)
    for candidate in candidates:
        target = rejected_groups if candidate["status"] == "rejected_pre_review" else chapter_groups
        target[candidate["chapterId"]].append(candidate)

    chapters = []
    for chapter_id, rows in sorted(chapter_groups.items()):
        file_path = paths.candidates_dir / f"{chapter_id}.jsonl"
        chapters.append({"chapterId": chapter_id, "file": str(file_path), "count": write_jsonl(file_path, rows)})
    for chapter_id, rows in sorted(rejected_groups.items()):
        file_path = paths.rejected_candidates_dir / f"{chapter_id}.jsonl"
        write_jsonl(file_path, rows)

    index = {
        "candidateCount": len(candidates),
        "chapters": chapters,
        "rejectedChapters": [
            {"chapterId": chapter_id, "file": str(paths.rejected_candidates_dir / f"{chapter_id}.jsonl"), "count": len(rows)}
            for chapter_id, rows in sorted(rejected_groups.items())
        ],
    }
    save_json(paths.candidates_index_path, index)
    return index


def verify_candidates(manifest: dict) -> tuple[list[dict], dict]:
    build_paths = get_build_paths(manifest["buildId"])
    candidates = load_json(build_paths.question_candidates_path, default=[]) or []
    indexes = build_provenance_indexes(manifest)
    prompt_counts = Counter(normalize_text(candidate.get("prompt", "")) for candidate in candidates)

    verified = []
    issue_breakdown: Counter[str] = Counter()
    chapter_breakdown: dict[str, Counter[str]] = defaultdict(Counter)
    retry_targets = []
    deterministic_rejected = 0
    semantic_rejected = 0
    semantic_unavailable = 0

    for candidate in candidates:
        issues, score, flags = verify_candidate(candidate, indexes)
        prompt_key = normalize_text(candidate.get("prompt", ""))
        duplicate_risk = "high" if prompt_counts[prompt_key] > 1 else "low"
        if duplicate_risk == "high":
            issues.append({"code": "duplicate_prompt_family", "severity": "warning", "message": "Prompt repetido dentro del build."})
            score = max(0, score - 15)

        critical_fail = any(issue["severity"] == "critical" for issue in issues)
        if not critical_fail:
            semantic_issues, semantic_penalty = semantic_llm_check(candidate, manifest)
            issues.extend(semantic_issues)
            score = max(0, score - semantic_penalty)
            if semantic_issues:
                semantic_rejected += 1
            if any(issue["code"] == "semantic_verifier_unavailable" for issue in semantic_issues):
                semantic_unavailable += 1
        else:
            deterministic_rejected += 1

        for issue in issues:
            issue_breakdown[issue["code"]] += 1
            chapter_breakdown[candidate["chapterId"]][issue["code"]] += 1
            if issue["severity"] == "critical":
                retry_targets.append(
                    {
                        "scope": "candidate",
                        "candidateId": candidate["candidateId"],
                        "chapterId": candidate["chapterId"],
                        "pageRange": candidate.get("groundingRefs", {}).get("pageRange"),
                        "reason": issue["code"],
                        "recommendedStage": "verify_candidates",
                    }
                )

        critical_fail = any(issue["severity"] == "critical" for issue in issues)
        candidate["verifier"] = {
            **flags,
            "semanticVerificationPassed": not any(issue["code"].startswith("semantic_") for issue in issues),
            "duplicateRisk": duplicate_risk,
            "issues": issues,
            "score": score,
        }
        candidate["status"] = "verified" if not critical_fail and score >= 55 else "rejected_pre_review"
        verified.append(candidate)

    report = {
        "buildId": manifest["buildId"],
        "candidateCount": len(verified),
        "verifiedCount": sum(1 for candidate in verified if candidate["status"] == "verified"),
        "rejectedCount": sum(1 for candidate in verified if candidate["status"] == "rejected_pre_review"),
        "deterministicRejectedCount": deterministic_rejected,
        "semanticIssueCount": semantic_rejected,
        "semanticUnavailableCount": semantic_unavailable,
        "issueBreakdown": dict(issue_breakdown),
        "chapterBreakdown": {chapter: dict(counter) for chapter, counter in chapter_breakdown.items()},
    }

    save_json(build_paths.question_candidates_path, verified)
    save_json(build_paths.evaluation_report_path, report)
    write_candidate_jsonl(build_paths, verified)
    existing_retry = load_json(build_paths.retry_report_path, default={}) or {}
    save_json(
        build_paths.retry_report_path,
        {
            **existing_retry,
            "buildId": manifest["buildId"],
            "retryTargets": [*(existing_retry.get("retryTargets") or []), *retry_targets],
        },
    )
    return verified, report


if __name__ == "__main__":
    manifest = build_manifest()
    _, report = verify_candidates(manifest)
    print(
        f"Verified candidates for {manifest['buildId']}: "
        f"{report['verifiedCount']} exportables, {report['rejectedCount']} rechazadas."
    )

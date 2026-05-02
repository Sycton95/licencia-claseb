from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from .pipeline_common import (
    get_build_paths,
    list_runs_for_source,
    load_json,
    normalize_for_matching,
    save_json,
)


def _token_set(value: str) -> set[str]:
    return {token for token in normalize_for_matching(value).split() if token}


def _coverage_similarity(left: str, right: str) -> float:
    normalized_left = normalize_for_matching(left)
    normalized_right = normalize_for_matching(right)
    if not normalized_left or not normalized_right:
        return 0.0
    if normalized_left == normalized_right:
        return 1.0
    shorter = normalized_left if len(normalized_left) <= len(normalized_right) else normalized_right
    longer = normalized_right if len(normalized_left) <= len(normalized_right) else normalized_left
    if shorter and shorter in longer:
        return round(len(shorter) / len(longer), 4)
    return 0.0


def _token_overlap_similarity(left: str, right: str) -> float:
    left_tokens = _token_set(left)
    right_tokens = _token_set(right)
    if not left_tokens or not right_tokens:
        return 0.0
    return round(len(left_tokens & right_tokens) / max(len(left_tokens | right_tokens), 1), 4)


def candidate_canonical_view(candidate: dict[str, Any]) -> dict[str, str]:
    options = candidate.get("options") or []
    option_texts = []
    for option in options:
        if isinstance(option, dict):
            option_texts.append(option.get("text", ""))
        else:
            option_texts.append(str(option))

    correct_indexes = candidate.get("correctOptionIndexes") or []
    correct_answer_text = " ".join(
        option_texts[index]
        for index in correct_indexes
        if 0 <= index < len(option_texts)
    )
    return {
        "prompt": candidate.get("prompt", ""),
        "answer": correct_answer_text,
        "options": " ".join(option_texts),
        "grounding": candidate.get("groundingExcerpt", ""),
        "explanation": candidate.get("publicExplanation", ""),
    }


def hybrid_similarity(left: dict[str, str], right: dict[str, str]) -> float:
    prompt_similarity = max(
        _token_overlap_similarity(left["prompt"], right["prompt"]),
        _coverage_similarity(left["prompt"], right["prompt"]),
    )
    answer_similarity = max(
        _token_overlap_similarity(left["answer"], right["answer"]),
        1.0 if left["answer"] and left["answer"] == right["answer"] else 0.0,
    )
    options_similarity = max(
        _token_overlap_similarity(left["options"], right["options"]),
        _coverage_similarity(left["options"], right["options"]),
    )
    grounding_similarity = max(
        _token_overlap_similarity(left["grounding"], right["grounding"]),
        _coverage_similarity(left["grounding"], right["grounding"]),
    )
    explanation_similarity = max(
        _token_overlap_similarity(left["explanation"], right["explanation"]),
        _coverage_similarity(left["explanation"], right["explanation"]),
    )
    weighted = (
        prompt_similarity * 0.35
        + answer_similarity * 0.20
        + options_similarity * 0.20
        + grounding_similarity * 0.20
        + explanation_similarity * 0.05
    )
    return round(weighted, 4)


def build_candidate_fingerprint(candidate: dict[str, Any]) -> str:
    view = candidate_canonical_view(candidate)
    fingerprint_payload = "|".join(
        [
            normalize_for_matching(view["prompt"]),
            normalize_for_matching(view["answer"]),
            normalize_for_matching(view["options"]),
            normalize_for_matching(view["grounding"]),
            normalize_for_matching(candidate.get("generationMode", "")),
            normalize_for_matching(candidate.get("visualDependency", "none")),
            "|".join(sorted(candidate.get("unitIds", []) or [])),
        ]
    )
    return hashlib.sha256(fingerprint_payload.encode("utf-8")).hexdigest()


def build_semantic_comparison_text(candidate: dict[str, Any]) -> str:
    view = candidate_canonical_view(candidate)
    return "\n".join(
        part
        for part in [
            view["prompt"],
            view["answer"],
            view["options"],
            view["grounding"],
            view["explanation"],
        ]
        if part.strip()
    )


def enrich_candidate_iteration_fields(candidate: dict[str, Any]) -> dict[str, Any]:
    candidate["candidateFingerprint"] = build_candidate_fingerprint(candidate)
    candidate["semanticComparisonText"] = build_semantic_comparison_text(candidate)
    return candidate


def load_previous_run_candidates(source_build_id: str, current_run_id: str) -> list[dict[str, Any]]:
    previous_candidates: list[dict[str, Any]] = []
    for run in list_runs_for_source(source_build_id):
        run_id = run.get("runId")
        if not run_id or run_id == current_run_id:
            continue
        candidate_path = get_build_paths(run_id).question_candidates_path
        candidates = load_json(candidate_path, default=[]) or []
        for candidate in candidates:
            if candidate.get("status") not in {"verified", "exported"}:
                continue
            previous_candidates.append(enrich_candidate_iteration_fields(candidate))
    return previous_candidates


def analyze_cross_run_novelty(manifest: dict, candidates: list[dict[str, Any]]) -> dict[str, Any]:
    source_build_id = manifest["sourceBuildId"]
    current_run_id = manifest["runId"]
    previous_candidates = load_previous_run_candidates(source_build_id, current_run_id)

    previous_by_fingerprint = {
        candidate["candidateFingerprint"]: candidate
        for candidate in previous_candidates
        if candidate.get("candidateFingerprint")
    }
    previous_by_unit: dict[str, list[dict[str, Any]]] = {}
    previous_by_family: dict[str, list[dict[str, Any]]] = {}

    for candidate in previous_candidates:
        for unit_id in candidate.get("unitIds", []) or []:
            previous_by_unit.setdefault(unit_id, []).append(candidate)
        family_key = candidate.get("duplicateFamilyKey")
        if family_key:
            previous_by_family.setdefault(family_key, []).append(candidate)

    counts = {
        "novel": 0,
        "duplicate_previous_run": 0,
        "near_duplicate_previous_run": 0,
        "same_grounding_reworded": 0,
    }
    candidate_reports = []

    for candidate in candidates:
        enrich_candidate_iteration_fields(candidate)
        fingerprint = candidate["candidateFingerprint"]
        report = {
            "candidateId": candidate.get("candidateId"),
            "classification": "novel",
            "matchedRunId": None,
            "matchedCandidateId": None,
            "similarity": 0.0,
            "reason": "No prior-run duplicate detected.",
        }

        if fingerprint in previous_by_fingerprint:
            matched = previous_by_fingerprint[fingerprint]
            report.update(
                {
                    "classification": "duplicate_previous_run",
                    "matchedRunId": matched.get("runId", matched.get("buildId")),
                    "matchedCandidateId": matched.get("candidateId"),
                    "similarity": 1.0,
                    "reason": "Exact fingerprint match against a prior run.",
                }
            )
        else:
            candidate_view = candidate_canonical_view(candidate)
            comparison_pool: list[dict[str, Any]] = []
            for unit_id in candidate.get("unitIds", []) or []:
                comparison_pool.extend(previous_by_unit.get(unit_id, []))
            comparison_pool.extend(previous_by_family.get(candidate.get("duplicateFamilyKey"), []))

            seen_keys = set()
            deduped_pool = []
            for item in comparison_pool:
                key = item.get("candidateId")
                if key and key not in seen_keys:
                    seen_keys.add(key)
                    deduped_pool.append(item)

            best_match = None
            best_similarity = 0.0
            best_grounding_similarity = 0.0
            best_answer_similarity = 0.0
            for previous in deduped_pool:
                previous_view = candidate_canonical_view(previous)
                similarity = hybrid_similarity(candidate_view, previous_view)
                if similarity <= best_similarity:
                    continue
                best_similarity = similarity
                best_grounding_similarity = max(
                    _token_overlap_similarity(candidate_view["grounding"], previous_view["grounding"]),
                    _coverage_similarity(candidate_view["grounding"], previous_view["grounding"]),
                )
                best_answer_similarity = max(
                    _token_overlap_similarity(candidate_view["answer"], previous_view["answer"]),
                    1.0 if candidate_view["answer"] and candidate_view["answer"] == previous_view["answer"] else 0.0,
                )
                best_match = previous

            if best_match and best_similarity >= 0.88:
                classification = "near_duplicate_previous_run"
                reason = "High semantic similarity against a prior run."
                if best_grounding_similarity >= 0.92 and best_answer_similarity >= 1.0:
                    classification = "same_grounding_reworded"
                    reason = "Same grounding and answer, with a reworded prompt."
                report.update(
                    {
                        "classification": classification,
                        "matchedRunId": best_match.get("runId", best_match.get("buildId")),
                        "matchedCandidateId": best_match.get("candidateId"),
                        "similarity": best_similarity,
                        "reason": reason,
                    }
                )

        counts[report["classification"]] += 1
        candidate["iterationMetadata"] = report
        candidate_reports.append(report)

    total = len(candidates)
    novelty_rate = round((counts["novel"] / total), 4) if total else 0.0
    report = {
        "runId": current_run_id,
        "sourceBuildId": source_build_id,
        "totalCandidates": total,
        "priorRunCandidateCount": len(previous_candidates),
        "exactDuplicateCount": counts["duplicate_previous_run"],
        "nearDuplicateCount": counts["near_duplicate_previous_run"],
        "sameGroundingRewordedCount": counts["same_grounding_reworded"],
        "novelCandidateCount": counts["novel"],
        "noveltyRate": novelty_rate,
        "warning": (
            counts["duplicate_previous_run"] > max(10, round(total * 0.15))
            or novelty_rate < 0.45
        ),
        "similarityMethod": "hybrid_local_v1",
        "candidateReports": candidate_reports,
    }
    save_json(get_build_paths(current_run_id).build_dir / "run-novelty-report.json", report)
    return report

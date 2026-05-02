from collections import defaultdict

from build_manifest import build_manifest

from lib.pipeline_common import (
    artifact_relative_path,
    get_build_paths,
    load_json,
    normalize_for_matching,
    save_json,
    utc_now_iso,
    write_jsonl,
)
from lib.run_iteration import analyze_cross_run_novelty


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


def _canonical_candidate_text(exported_member: dict, source_candidate: dict) -> dict:
    options = exported_member.get("options") or source_candidate.get("options") or []
    option_texts = []
    for option in options:
        if isinstance(option, dict):
            option_texts.append(option.get("text", ""))
        else:
            option_texts.append(str(option))

    correct_indexes = exported_member.get("correctOptionIndexes") or source_candidate.get("correctOptionIndexes") or []
    correct_answer_text = " ".join(
        option_texts[index]
        for index in correct_indexes
        if 0 <= index < len(option_texts)
    )
    return {
        "prompt": exported_member.get("prompt") or source_candidate.get("prompt") or "",
        "answer": correct_answer_text,
        "options": " ".join(option_texts),
        "grounding": exported_member.get("groundingExcerpt") or source_candidate.get("groundingExcerpt") or "",
        "explanation": exported_member.get("publicExplanation") or source_candidate.get("publicExplanation") or "",
    }


def _hybrid_similarity(left: dict, right: dict) -> float:
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


def build_duplicate_artifact(
    manifest: dict,
    candidates: list[dict],
    exportable: list[dict],
) -> dict:
    exported_ids = {item["externalId"] for item in exportable}
    exportable_by_id = {item["externalId"]: item for item in exportable}
    clusters_by_family: dict[str, list[dict]] = defaultdict(list)

    for candidate in candidates:
        external_id = candidate.get("candidateId")
        family_key = candidate.get("duplicateFamilyKey")
        if not external_id or external_id not in exported_ids or not family_key:
            continue
        clusters_by_family[family_key].append(candidate)

    clusters = []
    for index, family_key in enumerate(sorted(clusters_by_family), start=1):
        members = clusters_by_family[family_key]
        if len(members) < 2:
            continue

        ranked_members = sorted(
            members,
            key=lambda entry: (
                -float(entry.get("verifier", {}).get("score", 0)),
                entry.get("candidateId", ""),
            ),
        )
        suggested_winner = ranked_members[0]
        suggested_winner_id = suggested_winner["candidateId"]
        suggested_winner_score = float(suggested_winner.get("verifier", {}).get("score", 0))
        suggested_export = exportable_by_id.get(suggested_winner_id, {})
        suggested_semantic = _canonical_candidate_text(suggested_export, suggested_winner)

        cluster_members = []
        chapter_ids = set()
        for member in ranked_members:
            external_id = member["candidateId"]
            exported_member = exportable_by_id.get(external_id, {})
            chapter_id = exported_member.get("chapterId") or member.get("chapterId") or "unknown"
            chapter_ids.add(chapter_id)
            verifier = member.get("verifier", {})
            member_semantic = _canonical_candidate_text(exported_member, member)
            cluster_members.append(
                {
                    "externalId": external_id,
                    "chapterId": chapter_id,
                    "prompt": exported_member.get("prompt") or member.get("prompt") or "",
                    "sourcePageStart": exported_member.get("sourcePageStart"),
                    "sourcePageEnd": exported_member.get("sourcePageEnd"),
                    "sourceReference": exported_member.get("sourceReference"),
                    "publicExplanation": exported_member.get("publicExplanation"),
                    "groundingExcerpt": exported_member.get("groundingExcerpt"),
                    "verifierScore": float(verifier.get("score", 0)),
                    "verifierBreakdown": verifier.get("verifierBreakdown"),
                    "verifierIssueCount": len(verifier.get("issues", [])),
                    "generationMode": member.get("generationMode", "text"),
                    "visualDependency": member.get("visualDependency", "none"),
                    "needsVisualAudit": bool(member.get("needsVisualAudit")),
                    "similarityToSuggested": _hybrid_similarity(
                        member_semantic,
                        suggested_semantic,
                    ),
                }
            )

        clusters.append(
            {
                "clusterId": f"{manifest['buildId']}-dup-{index:03d}",
                "familyKey": family_key,
                "suggestedWinnerId": suggested_winner_id,
                "suggestedWinnerScore": suggested_winner_score,
                "suggestedWinnerReason": "Winner ranked by verifier score within the duplicate family.",
                "classification": "duplicate_family",
                "reviewerSummary": (
                    f"Cluster with {len(cluster_members)} similar candidates. "
                    f"Suggested winner {suggested_winner_id} has the strongest verifier score."
                ),
                "chapterIds": sorted(chapter_ids),
                "members": cluster_members,
            }
        )

    return {
        "buildId": manifest["buildId"],
        "runId": manifest.get("runId", manifest["buildId"]),
        "sourceBuildId": manifest.get("sourceBuildId", manifest["buildId"]),
        "generatedAt": utc_now_iso(),
        "clusterCount": len(clusters),
        "similarityMethod": "hybrid_local_v1",
        "clusters": clusters,
    }


def export_review_package(manifest: dict) -> list[dict]:
    build_paths = get_build_paths(manifest["buildId"])
    candidates = load_json(build_paths.question_candidates_path, default=[]) or []
    units_by_id = {
        unit["unitId"]: unit for unit in (load_json(build_paths.knowledge_units_path, default=[]) or [])
    }
    chapter_titles = {
        entry["chapterId"]: entry["title"] for entry in manifest.get("chapterMap", [])
    }
    exportable = []

    for candidate in candidates:
        if candidate["status"] not in {"verified", "exported"}:
            continue

        verifier = candidate["verifier"]
        grounding_anchors = [
            span
            for unit_id in candidate.get("unitIds", [])
            for span in units_by_id.get(unit_id, {}).get("groundingSpans", [])
        ]
        exportable.append(
            {
                "externalId": candidate["candidateId"],
                "prompt": candidate["prompt"],
                "selectionMode": "multiple"
                if candidate["questionType"] == "multiple_choice"
                else "single",
                "instruction": candidate["instruction"],
                "options": candidate["options"],
                "correctOptionIndexes": candidate["correctOptionIndexes"],
                "publicExplanation": candidate["publicExplanation"],
                "sourcePageStart": candidate["groundingRefs"]["pageRange"]["start"],
                "sourcePageEnd": candidate["groundingRefs"]["pageRange"]["end"],
                "sourceReference": (
                    f"Pág. {candidate['groundingRefs']['pageRange']['start']} · "
                    f"{chapter_titles.get(candidate['chapterId'], candidate['chapterId'])}"
                ),
                "groundingExcerpt": candidate["groundingExcerpt"],
                "reviewNotes": candidate["generatorRationale"],
                "tags": [candidate["generationMode"], candidate["chapterId"]],
                "chapterId": candidate["chapterId"],
                "runId": manifest.get("runId", manifest["buildId"]),
                "sourceBuildId": manifest.get("sourceBuildId", manifest["buildId"]),
                "manualFactRefs": [],
                "manualCitationRefs": candidate["unitIds"],
                "reviewDisposition": "accepted_with_warning",
                "groundingMode": "manual",
                "autoGroundingConfidence": verifier["score"] / 100,
                "needsVisualAudit": candidate["needsVisualAudit"],
                "visualDependency": candidate.get("visualDependency", "none"),
                "sandboxProvenance": {
                    "buildId": candidate["buildId"],
                    "runId": candidate.get("runId", candidate["buildId"]),
                    "sourceBuildId": candidate.get("sourceBuildId", candidate["buildId"]),
                    "candidateId": candidate["candidateId"],
                    "unitIds": candidate["unitIds"],
                    "generationMode": candidate["generationMode"],
                    "visualDependency": candidate.get("visualDependency", "none"),
                    "verifierScore": verifier["score"],
                    "verifierBreakdown": verifier.get("verifierBreakdown"),
                    "verifierIssues": verifier["issues"],
                    "requiredMedia": candidate["requiredMedia"],
                    "groundingAnchors": grounding_anchors,
                    "visualSupport": {
                        "required": candidate["needsVisualAudit"],
                        "assetIds": candidate["groundingRefs"]["assetIds"],
                    },
                },
            }
        )
        candidate["status"] = "exported"

    chapter_groups = defaultdict(list)
    for item in exportable:
        chapter_groups[item["chapterId"]].append(item)

    chapters = []
    for chapter_id, rows in sorted(chapter_groups.items()):
        file_path = build_paths.review_export_dir / f"{chapter_id}.jsonl"
        chapters.append(
            {
                "chapterId": chapter_id,
                "file": str(file_path),
                "count": write_jsonl(file_path, rows),
            }
        )

    duplicate_artifact = build_duplicate_artifact(manifest, candidates, exportable)
    novelty_report = analyze_cross_run_novelty(manifest, candidates)
    save_json(build_paths.duplicates_path, duplicate_artifact)

    save_json(
        build_paths.review_export_dir / "manifest.json",
        {
            "buildId": manifest["buildId"],
            "runId": manifest.get("runId", manifest["buildId"]),
            "sourceBuildId": manifest.get("sourceBuildId", manifest["buildId"]),
            "editionId": manifest.get("editionId"),
            "manualYear": manifest.get("manualYear"),
            "sourceDocumentId": manifest.get("sourceDocument", {}).get("documentId"),
            "generatedAt": utc_now_iso(),
            "exportedCount": len(exportable),
            "duplicateClusterCount": duplicate_artifact["clusterCount"],
            "duplicatesFile": artifact_relative_path(build_paths.duplicates_path),
            "noveltyReportFile": artifact_relative_path(build_paths.build_dir / "run-novelty-report.json"),
            "exactDuplicateCount": novelty_report["exactDuplicateCount"],
            "nearDuplicateCount": novelty_report["nearDuplicateCount"],
            "novelCandidateCount": novelty_report["novelCandidateCount"],
            "noveltyRate": novelty_report["noveltyRate"],
            "noveltyWarning": novelty_report["warning"],
            "chapters": chapters,
        },
    )
    save_json(build_paths.question_candidates_path, candidates)
    save_json(build_paths.review_export_path, exportable)
    return exportable


if __name__ == "__main__":
    manifest = build_manifest()
    exportable = export_review_package(manifest)
    print(f"Exported {len(exportable)} verified candidates for Admin review.")

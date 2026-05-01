from build_manifest import build_manifest
from collections import defaultdict

from lib.pipeline_common import get_build_paths, load_json, save_json, write_jsonl


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
                "manualFactRefs": [],
                "manualCitationRefs": candidate["unitIds"],
                "reviewDisposition": "accepted_with_warning",
                "groundingMode": "manual",
                "autoGroundingConfidence": verifier["score"] / 100,
                "needsVisualAudit": candidate["needsVisualAudit"],
                "sandboxProvenance": {
                    "buildId": candidate["buildId"],
                    "candidateId": candidate["candidateId"],
                    "unitIds": candidate["unitIds"],
                    "generationMode": candidate["generationMode"],
                    "verifierScore": verifier["score"],
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

    save_json(
        build_paths.review_export_dir / "manifest.json",
        {
            "buildId": manifest["buildId"],
            "exportedCount": len(exportable),
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

from collections import defaultdict

from build_manifest import build_manifest
from lib.pipeline_common import get_build_paths, load_json, save_json


def normalize_text(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def score_and_dedupe(manifest: dict) -> dict:
    build_paths = get_build_paths(manifest["buildId"])
    candidates = load_json(build_paths.question_candidates_path, default=[]) or []

    families: dict[str, list[dict]] = defaultdict(list)
    for candidate in candidates:
        family_key = f"{candidate['duplicateFamilyKey']}::{normalize_text(candidate['prompt'])[:120]}"
        families[family_key].append(candidate)

    deduped = []
    clustered_count = 0
    rejected_cluster_count = 0
    for family_candidates in families.values():
        family_candidates.sort(key=lambda item: item["verifier"]["score"], reverse=True)
        winner = family_candidates[0]
        winner["status"] = "verified" if winner["status"] == "verified" else winner["status"]
        deduped.append(winner)
        for loser in family_candidates[1:]:
            clustered_count += 1
            if loser["status"] != "verified":
                rejected_cluster_count += 1
            loser["status"] = "rejected_pre_review"
            loser["verifier"]["issues"].append(
                {
                    "code": "deduped_within_build",
                    "severity": "warning",
                    "message": f"Agrupada con {winner['candidateId']} dentro de la misma familia.",
                }
            )
            deduped.append(loser)

    deduped.sort(key=lambda item: item["verifier"]["score"], reverse=True)
    report = {
        "buildId": manifest["buildId"],
        "candidateCount": len(deduped),
        "dedupedWithinBuild": clustered_count,
        "rejectedClusteredCount": rejected_cluster_count,
        "topVerifiedCount": sum(1 for candidate in deduped if candidate["status"] == "verified"),
    }
    save_json(build_paths.question_candidates_path, deduped)
    save_json(build_paths.evaluation_report_path, {**load_json(build_paths.evaluation_report_path, {}), **report})
    return report


if __name__ == "__main__":
    manifest = build_manifest()
    report = score_and_dedupe(manifest)
    print(
        f"Scored and deduped {report['candidateCount']} candidates; "
        f"{report['dedupedWithinBuild']} were clustered within the build."
    )

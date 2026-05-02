from collections import defaultdict

from build_manifest import build_manifest
from lib.pipeline_common import get_build_paths, load_json, save_json
from lib.run_iteration import candidate_canonical_view, hybrid_similarity


WITHIN_UNIT_DUPLICATE_SIMILARITY = 0.78


def normalize_text(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def unit_signature(candidate: dict) -> str:
    return "|".join(sorted(candidate.get("unitIds", []) or []))


def candidate_sort_key(candidate: dict) -> tuple:
    return (
        candidate["verifier"]["score"],
        1 if candidate.get("variantStrategy") == "direct_grounded" else 0,
        candidate.get("candidateId", ""),
    )


def score_and_dedupe(manifest: dict) -> dict:
    build_paths = get_build_paths(manifest["buildId"])
    candidates = load_json(build_paths.question_candidates_path, default=[]) or []

    families: dict[str, list[dict]] = defaultdict(list)
    for candidate in candidates:
        family_key = f"{candidate['duplicateFamilyKey']}::{unit_signature(candidate)}"
        families[family_key].append(candidate)

    deduped = []
    clustered_count = 0
    rejected_cluster_count = 0
    kept_distinct_count = 0

    for family_candidates in families.values():
        family_candidates.sort(key=candidate_sort_key, reverse=True)
        kept_candidates: list[dict] = []

        for candidate in family_candidates:
            if candidate["status"] != "verified":
                deduped.append(candidate)
                continue

            best_match = None
            best_similarity = 0.0
            for winner in kept_candidates:
                similarity = hybrid_similarity(
                    candidate_canonical_view(candidate),
                    candidate_canonical_view(winner),
                )
                if candidate.get("candidateFingerprint") == winner.get("candidateFingerprint"):
                    similarity = 1.0
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = winner

            if best_match and best_similarity >= WITHIN_UNIT_DUPLICATE_SIMILARITY:
                clustered_count += 1
                candidate["status"] = "rejected_pre_review"
                candidate["verifier"]["issues"].append(
                    {
                        "code": "deduped_within_build",
                        "severity": "warning",
                        "message": f"Agrupada con {best_match['candidateId']} dentro de la misma unidad/familia (similitud {best_similarity:.2f}).",
                    }
                )
                rejected_cluster_count += 1
                deduped.append(candidate)
                continue

            kept_candidates.append(candidate)
            kept_distinct_count += 1
            deduped.append(candidate)

    deduped.sort(key=lambda item: item["verifier"]["score"], reverse=True)
    report = {
        "buildId": manifest["buildId"],
        "candidateCount": len(deduped),
        "dedupedWithinBuild": clustered_count,
        "rejectedClusteredCount": rejected_cluster_count,
        "keptDistinctWithinUnitCount": kept_distinct_count,
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

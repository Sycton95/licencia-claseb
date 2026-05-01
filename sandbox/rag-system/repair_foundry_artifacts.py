import argparse

from derive_knowledge_units import build_knowledge_units
from export_review_package import export_review_package
from lib.pipeline_common import get_build_paths, load_json
from sanitize_page_artifacts import repair_build
from verify_candidates import verify_candidates


def run_repair_pipeline(source_build_id: str, repaired_build_id: str | None = None) -> dict:
    repair_result = repair_build(source_build_id, repaired_build_id)
    repaired_id = repair_result["repairedBuildId"]
    manifest = load_json(get_build_paths(repaired_id).manifest_path)
    units = build_knowledge_units(manifest)
    candidates, verification_report = verify_candidates(manifest)
    review_export = export_review_package(manifest)
    return {
        **repair_result,
        "unitCount": len(units),
        "candidateCount": len(candidates),
        "verifiedCount": verification_report["verifiedCount"],
        "rejectedCount": verification_report["rejectedCount"],
        "reviewExportCount": len(review_export),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Repair foundry artifacts without rerunning VLM extraction.")
    parser.add_argument("--build-id", required=True)
    parser.add_argument("--repaired-build-id")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    result = run_repair_pipeline(args.build_id, args.repaired_build_id)
    print(
        f"Repair complete: {result['sourceBuildId']} -> {result['repairedBuildId']}; "
        f"{result['unitCount']} units, {result['verifiedCount']} verified, "
        f"{result['reviewExportCount']} exported."
    )

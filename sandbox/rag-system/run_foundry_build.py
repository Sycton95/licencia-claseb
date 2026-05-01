from build_manifest import build_manifest
from build_vectors import build_vectors
from derive_knowledge_units import build_knowledge_units
from export_review_package import export_review_package
from extract_pages_vision import extract_page_artifacts
from generate_candidates import generate_candidates
from score_and_dedupe import score_and_dedupe
from verify_candidates import verify_candidates


def run_foundry_build() -> dict:
    manifest = build_manifest()
    page_artifacts = extract_page_artifacts(manifest)
    knowledge_units = build_knowledge_units(manifest)
    vector_stats = build_vectors(manifest)
    candidates = generate_candidates(manifest)
    _, verification_report = verify_candidates(manifest)
    dedupe_report = score_and_dedupe(manifest)
    review_export = export_review_package(manifest)

    return {
        "buildId": manifest["buildId"],
        "pageArtifactCount": len(page_artifacts),
        "knowledgeUnitCount": len(knowledge_units),
        "vectorCount": vector_stats["vectorCount"],
        "candidateCount": len(candidates),
        "verifiedCount": verification_report["verifiedCount"],
        "rejectedCount": verification_report["rejectedCount"],
        "dedupedWithinBuild": dedupe_report["dedupedWithinBuild"],
        "reviewExportCount": len(review_export),
    }


if __name__ == "__main__":
    report = run_foundry_build()
    print(
        "Foundry build complete: "
        f"{report['pageArtifactCount']} pages, "
        f"{report['knowledgeUnitCount']} units, "
        f"{report['vectorCount']} vectors, "
        f"{report['candidateCount']} candidates, "
        f"{report['reviewExportCount']} exportables."
    )

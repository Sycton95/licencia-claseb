from pathlib import Path

from lib.pipeline_common import (
    DEFAULT_CHAPTER_MAP,
    DEFAULT_DOCUMENT_ID,
    DEFAULT_EDITION_ID,
    DEFAULT_MANUAL_PATH,
    DEFAULT_MODELS,
    build_id_for_manual,
    get_build_paths,
    save_json,
    sha256_file,
    utc_now_iso,
)


def build_manifest(
    manual_path: Path = DEFAULT_MANUAL_PATH,
    edition_id: str = DEFAULT_EDITION_ID,
    document_id: str = DEFAULT_DOCUMENT_ID,
    manual_year: int = 2026,
) -> dict:
    build_id = build_id_for_manual(manual_year, manual_path)
    paths = get_build_paths(build_id)
    source_hash = sha256_file(manual_path)

    manifest = {
        "buildId": build_id,
        "editionId": edition_id,
        "manualYear": manual_year,
        "sourceDocument": {
            "documentId": document_id,
            "title": "Manual del nuevo conductor Clase B",
            "issuer": "Comisión Nacional de Seguridad de Tránsito",
            "year": manual_year,
            "pdfPath": str(manual_path),
            "sha256": source_hash,
        },
        "chapterMap": DEFAULT_CHAPTER_MAP,
        "models": DEFAULT_MODELS,
        "artifacts": {
            "pageArtifacts": str(paths.page_artifacts_path),
            "knowledgeUnits": str(paths.knowledge_units_path),
            "vectorCache": str(paths.vector_path),
            "vectorMapping": str(paths.vector_mapping_path),
            "questionCandidates": str(paths.question_candidates_path),
            "questionCandidatesJsonl": str(paths.candidates_dir),
            "rejectedCandidatesJsonl": str(paths.rejected_candidates_dir),
            "evaluationReport": str(paths.evaluation_report_path),
            "reviewExport": str(paths.review_export_path),
            "reviewExportJsonl": str(paths.review_export_dir),
            "retryReport": str(paths.retry_report_path),
        },
        "createdAt": utc_now_iso(),
    }

    save_json(paths.manifest_path, manifest)
    return manifest


if __name__ == "__main__":
    manifest = build_manifest()
    print(f"Manifest created: {manifest['buildId']}")

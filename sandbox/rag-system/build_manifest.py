from pathlib import Path
import os

from lib.pipeline_common import (
    DEFAULT_CHAPTER_MAP,
    DEFAULT_DOCUMENT_ID,
    DEFAULT_EDITION_ID,
    DEFAULT_MANUAL_PATH,
    build_id_for_manual,
    create_run_id,
    get_build_paths,
    resolve_models,
    save_json,
    sha256_file,
    upsert_run_registry_entry,
    utc_now_iso,
)


def build_manifest(
    manual_path: Path = DEFAULT_MANUAL_PATH,
    edition_id: str = DEFAULT_EDITION_ID,
    document_id: str = DEFAULT_DOCUMENT_ID,
    manual_year: int = 2026,
    source_build_id: str | None = None,
    run_id: str | None = None,
    parent_run_id: str | None = None,
) -> dict:
    source_hash = sha256_file(manual_path)
    source_build_id = source_build_id or build_id_for_manual(manual_year, manual_path)
    created_at = utc_now_iso()
    models = resolve_models()
    run_id = run_id or create_run_id(source_build_id, models["generatorModel"], created_at=created_at)
    paths = get_build_paths(run_id)

    manifest = {
        "buildId": run_id,
        "runId": run_id,
        "sourceBuildId": source_build_id,
        "parentRunId": parent_run_id,
        "manualHash": source_hash,
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
        "models": models,
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
            "duplicates": str(paths.duplicates_path),
            "retryReport": str(paths.retry_report_path),
        },
        "createdAt": created_at,
    }

    save_json(paths.manifest_path, manifest)
    upsert_run_registry_entry(
        {
            "runId": run_id,
            "buildId": run_id,
            "sourceBuildId": source_build_id,
            "parentRunId": parent_run_id,
            "manualHash": source_hash,
            "manualYear": manual_year,
            "editionId": edition_id,
            "createdAt": created_at,
            "status": "running",
            "models": models,
            "promptTemplateVersion": "v2-calibrated",
            "maxCandidatesPerUnit": int(os.getenv("RAG_MAX_CANDIDATES_PER_UNIT", "2")),
            "semanticVerifierEnabled": os.getenv("RAG_ENABLE_SEMANTIC_VERIFIER", "0") == "1",
        }
    )
    return manifest


if __name__ == "__main__":
    manifest = build_manifest()
    print(f"Manifest created: {manifest['buildId']}")

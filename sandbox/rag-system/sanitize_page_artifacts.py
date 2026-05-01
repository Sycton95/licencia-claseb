import argparse
import shutil
from collections import Counter, defaultdict
from pathlib import Path

from lib.pipeline_common import (
    ARTIFACTS_DIR,
    artifact_relative_path,
    clean_block_text,
    compute_parser_confidence,
    detect_visual_keywords,
    ensure_directory,
    get_build_paths,
    load_json,
    save_json,
    summarize_page_text,
)


MAX_BLOCKS_PER_PAGE = 80
MAX_VISUAL_BLOCKS_PER_PAGE = 20
MAX_EMPTY_RATIO = 0.25


def sanitize_existing_block(raw_block: dict, next_index: int) -> tuple[dict | None, list[str]]:
    raw_text = str(raw_block.get("text") or "")
    cleaned_text, issues = clean_block_text(raw_text)
    if not cleaned_text:
        return None, issues or ["empty_block_removed"]

    explicit_visual = raw_text.strip().startswith("[VISUAL]:")
    block_type = "visual" if explicit_visual else raw_block.get("type", "paragraph")
    if block_type == "visual" and not explicit_visual:
        block_type = "paragraph"
        issues.append("semantic_visual_downgraded")
    if block_type not in {"paragraph", "table", "list", "visual", "heading", "caption"}:
        block_type = "paragraph"

    confidence = compute_parser_confidence(block_type, cleaned_text, issues)
    if confidence <= 0:
        return None, issues

    return (
        {
            "blockId": raw_block.get("blockId") or f"block-{next_index:03d}",
            "type": block_type,
            "text": cleaned_text,
            "bbox": raw_block.get("bbox"),
            "confidence": confidence,
            "parserConfidence": confidence,
            "parserIssues": issues,
            "sourceBlockId": raw_block.get("blockId"),
        },
        issues,
    )


def sanitize_visual_assets(page: dict, blocks: list[dict]) -> tuple[list[dict], list[str]]:
    issues = []
    valid_visual_texts = [block["text"] for block in blocks if block["type"] == "visual"]
    page_image_path = artifact_relative_path(page.get("pageImagePath"))
    assets = [
        {
            "assetId": f"{page['pageId']}-asset-full-page",
            "kind": "full_page",
            "path": page_image_path,
            "bbox": None,
            "caption": "Página completa renderizada del manual.",
            "visionDescription": summarize_page_text(" ".join(valid_visual_texts), limit=220),
        }
    ]

    if len(valid_visual_texts) > MAX_VISUAL_BLOCKS_PER_PAGE:
        issues.append("excessive_visual_blocks")

    for index, text in enumerate(valid_visual_texts[:MAX_VISUAL_BLOCKS_PER_PAGE], start=1):
        assets.append(
            {
                "assetId": f"{page['pageId']}-asset-visual-{index:02d}",
                "kind": "figure",
                "path": page_image_path,
                "bbox": None,
                "caption": summarize_page_text(text, limit=140),
                "visionDescription": summarize_page_text(text, limit=220),
            }
        )
    return assets, issues


def sanitize_page(page: dict) -> tuple[dict, dict]:
    raw_blocks = page.get("ocrBlocks", [])
    sanitized_blocks = []
    removed_issues = Counter()

    for raw_block in raw_blocks:
        block, issues = sanitize_existing_block(raw_block, len(sanitized_blocks) + 1)
        for issue in issues:
            removed_issues[issue] += 1
        if block:
            sanitized_blocks.append(block)

    visual_assets, asset_issues = sanitize_visual_assets(page, sanitized_blocks)
    page_issues = list(page.get("extractionIssues") or [])
    page_issues.extend(asset_issues)

    raw_empty_count = sum(1 for block in raw_blocks if not str(block.get("text") or "").strip())
    raw_empty_ratio = raw_empty_count / max(1, len(raw_blocks))
    visual_block_count = sum(1 for block in sanitized_blocks if block["type"] == "visual")

    if len(raw_blocks) > MAX_BLOCKS_PER_PAGE:
        page_issues.append("excessive_block_count")
    if raw_empty_ratio > MAX_EMPTY_RATIO:
        page_issues.append("empty_block_ratio_high")
    if removed_issues.get("malformed_visual_tag_removed") or removed_issues.get("empty_block_removed"):
        page_issues.append("visual_loop_suspected")
    if removed_issues.get("fake_image_url_removed"):
        page_issues.append("fake_image_url_removed")
    if removed_issues.get("markdown_image_removed"):
        page_issues.append("markdown_image_removed")

    sanitized_page = {
        **page,
        "pageImagePath": artifact_relative_path(page.get("pageImagePath")),
        "ocrBlocks": sanitized_blocks,
        "visualAssets": visual_assets,
        "pageSummary": summarize_page_text(" ".join(block["text"] for block in sanitized_blocks)),
        "extractionIssues": sorted(set(page_issues)),
        "visualKeywords": detect_visual_keywords(" ".join(block["text"] for block in sanitized_blocks)),
    }

    report = {
        "pageId": page.get("pageId"),
        "pageNumber": page.get("pageNumber"),
        "chapterId": page.get("chapterId"),
        "rawBlockCount": len(raw_blocks),
        "sanitizedBlockCount": len(sanitized_blocks),
        "removedIssueBreakdown": dict(removed_issues),
        "visualBlockCount": visual_block_count,
        "visualAssetCount": len(visual_assets),
        "pageIssues": sanitized_page["extractionIssues"],
        "quarantined": False,
    }
    return sanitized_page, report


def build_repaired_manifest(source_manifest: dict, repaired_build_id: str) -> dict:
    paths = get_build_paths(repaired_build_id)
    manifest = {
        **source_manifest,
        "buildId": repaired_build_id,
        "parentBuildId": source_manifest["buildId"],
        "repairStrategy": "parser-sanitized-derivative",
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
    }
    save_json(paths.manifest_path, manifest)
    return manifest


def write_page_indexes(paths, pages: list[dict], reports: list[dict]) -> None:
    chapter_counts = defaultdict(int)
    for page in pages:
        chapter_counts[page["chapterId"]] += 1
    save_json(
        paths.pages_index_path,
        {
            "pageCount": len(pages),
            "chapterCounts": dict(chapter_counts),
            "anomalyPages": [
                report for report in reports if report["pageIssues"]
            ],
        },
    )


def repair_build(source_build_id: str, repaired_build_id: str | None = None) -> dict:
    source_paths = get_build_paths(source_build_id)
    source_manifest = load_json(source_paths.manifest_path)
    if not source_manifest:
        raise FileNotFoundError(f"Missing manifest for build {source_build_id}")

    repaired_build_id = repaired_build_id or f"{source_build_id}-repaired"
    repaired_manifest = build_repaired_manifest(source_manifest, repaired_build_id)
    repaired_paths = get_build_paths(repaired_build_id)

    source_pages = load_json(source_paths.page_artifacts_path, default=[]) or []
    sanitized_pages = []
    reports = []
    for page in source_pages:
        sanitized_page, report = sanitize_page(page)
        sanitized_pages.append(sanitized_page)
        reports.append(report)

    save_json(repaired_paths.page_artifacts_path, sanitized_pages)
    save_json(repaired_paths.quarantine_dir / "page-sanitization-report.json", reports)
    write_page_indexes(repaired_paths, sanitized_pages, reports)

    for optional_name in ("question-candidates.json", "evaluation-report.json", "review-export.json"):
        source_file = source_paths.build_dir / optional_name
        if source_file.exists():
            shutil.copy2(source_file, repaired_paths.build_dir / optional_name)

    retry_targets = [
        {
            "scope": "page",
            "chapterId": report["chapterId"],
            "pageNumber": report["pageNumber"],
            "reason": ",".join(report["pageIssues"]),
            "recommendedStage": "derive_knowledge_units",
        }
        for report in reports
        if report["pageIssues"]
    ]
    save_json(repaired_paths.retry_report_path, {"buildId": repaired_build_id, "retryTargets": retry_targets})

    return {
        "sourceBuildId": source_build_id,
        "repairedBuildId": repaired_build_id,
        "pageCount": len(sanitized_pages),
        "anomalyPageCount": len(retry_targets),
        "manifest": repaired_manifest,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sanitize and repair existing foundry page artifacts.")
    parser.add_argument("--build-id", required=True)
    parser.add_argument("--repaired-build-id")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    result = repair_build(args.build_id, args.repaired_build_id)
    print(
        f"Repaired {result['sourceBuildId']} -> {result['repairedBuildId']} "
        f"({result['pageCount']} pages, {result['anomalyPageCount']} anomaly pages)."
    )

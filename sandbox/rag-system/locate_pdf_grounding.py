import argparse
from pathlib import Path

import fitz

from build_manifest import build_manifest
from lib.pipeline_common import get_build_paths, load_json, save_json


def locate_excerpt_on_page(doc: fitz.Document, page_number: int, excerpt: str) -> dict | None:
    if not excerpt.strip():
        return None
    page = doc.load_page(page_number - 1)
    candidates = [excerpt.strip(), excerpt.strip()[:160], excerpt.strip()[:100]]
    for candidate in candidates:
        if len(candidate) < 20:
            continue
        matches = page.search_for(candidate)
        if matches:
            rect = matches[0]
            return {
                "bbox": [rect.x0, rect.y0, rect.x1, rect.y1],
                "bboxSource": "pymupdf_text_search",
                "matchedText": candidate,
            }
    return None


def enrich_grounding_locations(manifest: dict) -> dict:
    paths = get_build_paths(manifest["buildId"])
    units = load_json(paths.knowledge_units_path, default=[]) or []
    manual_path = Path(manifest["sourceDocument"]["pdfPath"])
    doc = fitz.open(manual_path)
    located = 0
    missed = 0

    for unit in units:
        for span in unit.get("groundingSpans", []):
            result = locate_excerpt_on_page(doc, span["pageNumber"], span["excerpt"])
            if result:
                span["bbox"] = result["bbox"]
                span["bboxSource"] = result["bboxSource"]
                span["matchedText"] = result["matchedText"]
                located += 1
            else:
                span["bboxSource"] = "not_found"
                missed += 1

    save_json(paths.knowledge_units_path, units)
    report = {"buildId": manifest["buildId"], "locatedCount": located, "missedCount": missed}
    save_json(paths.build_dir / "grounding-location-report.json", report)
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Locate knowledge-unit grounding excerpts in the source PDF.")
    parser.add_argument("--build-id")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.build_id:
        manifest = load_json(get_build_paths(args.build_id).manifest_path)
    else:
        manifest = build_manifest()
    report = enrich_grounding_locations(manifest)
    print(f"Located {report['locatedCount']} grounding spans; {report['missedCount']} not found.")

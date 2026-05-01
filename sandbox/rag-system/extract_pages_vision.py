import base64
from pathlib import Path

import fitz
from openai import OpenAI

from build_manifest import build_manifest
from lib.pipeline_common import (
    RENDERED_PAGES_DIR,
    artifact_relative_path,
    detect_visual_keywords,
    ensure_directory,
    get_build_paths,
    get_chapter_entry_for_page,
    retry_call,
    save_json,
    split_text_into_blocks,
    summarize_page_text,
)


OLLAMA_BASE_URL = "http://localhost:11434/v1"
VISION_MODEL = "qwen3-VL:4B-Instruct"

client = OpenAI(api_key="ollama", base_url=OLLAMA_BASE_URL)


def transcribe_page_with_vlm(image_bytes: bytes) -> str:
    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    prompt = """
    Actúa como un transcriptor experto de un manual de conducción.
    Devuelve un markdown estructurado y fiel a la página.
    - Conserva encabezados y listas.
    - Si ves tablas, conviértelas a un formato entendible.
    - IMPORTANTE: si hay señales, tableros, instrumentos o figuras, descríbelos detalladamente pero DEBES iniciar ese bloque exactamente con la etiqueta: "[VISUAL]: "
    - No agregues conclusiones ni inventes reglas fuera de la página.
    """
    response = retry_call(
        lambda: client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{encoded_image}"},
                        },
                    ],
                }
            ],
            temperature=0.1,
        ),
        attempts=3,
        sleep_seconds=2.0,
    )
    return response.choices[0].message.content.strip()


def build_visual_assets(page_image_path: Path, page_id: str, blocks: list[dict]) -> list[dict]:
    visual_blocks = [
        block
        for block in blocks
        if block["type"] == "visual"
        and block.get("parserConfidence", block.get("confidence", 0)) >= 0.5
        and block.get("text", "").strip()
    ][:20]
    artifact_path = artifact_relative_path(page_image_path)
    visual_assets = [
        {
            "assetId": f"{page_id}-asset-full-page",
            "kind": "full_page",
            "path": artifact_path,
            "bbox": None,
            "caption": "Página completa renderizada del manual.",
            "visionDescription": summarize_page_text(
                " ".join(block["text"] for block in visual_blocks),
                limit=220,
            ),
        }
    ]

    for index, block in enumerate(visual_blocks, start=1):
        visual_assets.append(
            {
                "assetId": f"{page_id}-asset-visual-{index:02d}",
                "kind": "figure",
                "path": artifact_path,
                "bbox": None,
                "caption": summarize_page_text(block["text"], limit=140),
                "visionDescription": summarize_page_text(block["text"], limit=220),
            }
        )

    return visual_assets


def extract_page_artifacts(manifest: dict) -> list[dict]:
    manual_path = Path(manifest["sourceDocument"]["pdfPath"])
    build_paths = get_build_paths(manifest["buildId"])
    source_hash = manifest["sourceDocument"]["sha256"]
    rendered_root = ensure_directory(RENDERED_PAGES_DIR / manifest["buildId"])

    if not manual_path.exists():
        raise FileNotFoundError(f"Manual PDF not found at {manual_path}")

    doc = fitz.open(manual_path)
    artifacts = []
    zoom_matrix = fitz.Matrix(2, 2)

    for index in range(len(doc)):
        page_number = index + 1
        chapter_entry = get_chapter_entry_for_page(page_number, manifest["chapterMap"])
        if not chapter_entry:
            continue

        page = doc.load_page(index)
        pix = page.get_pixmap(matrix=zoom_matrix, alpha=False)
        image_bytes = pix.tobytes("png")

        chapter_dir = ensure_directory(rendered_root / chapter_entry["chapterId"])
        page_image_path = chapter_dir / f"page-{page_number:03d}.png"
        pix.save(page_image_path)

        try:
            page_markdown = transcribe_page_with_vlm(image_bytes)
            blocks = split_text_into_blocks(page_markdown)
            visual_keywords = detect_visual_keywords(page_markdown)
            extraction_issues = [] if page_markdown else ["empty_transcription"]
        except Exception as error:  # noqa: BLE001
            page_markdown = ""
            blocks = []
            visual_keywords = []
            extraction_issues = [f"transcription_failed:{type(error).__name__}"]

        page_id = f"{manifest['buildId']}-p{page_number:03d}"
        artifacts.append(
            {
                "pageId": page_id,
                "editionId": manifest["editionId"],
                "chapterId": chapter_entry["chapterId"],
                "pageNumber": page_number,
                "pageImagePath": artifact_relative_path(page_image_path),
                "ocrMarkdown": page_markdown,
                "ocrBlocks": blocks,
                "visualAssets": build_visual_assets(page_image_path, page_id, blocks),
                "pageSummary": summarize_page_text(page_markdown),
                "extractionIssues": extraction_issues,
                "sourceHash": source_hash,
                "visualKeywords": visual_keywords,
            }
        )

        save_json(build_paths.page_artifacts_path, artifacts)

    return artifacts


if __name__ == "__main__":
    manifest = build_manifest()
    page_artifacts = extract_page_artifacts(manifest)
    print(f"Extracted {len(page_artifacts)} page artifacts for {manifest['buildId']}.")

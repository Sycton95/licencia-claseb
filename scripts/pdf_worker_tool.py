import base64
import hashlib
import mimetypes
import json
from pathlib import Path
import sys
from typing import Any

import pymupdf


def _read_payload() -> dict[str, Any]:
    if len(sys.argv) >= 3 and sys.argv[2].strip():
        return json.loads(sys.argv[2])
    raw = sys.stdin.read().strip()
    return json.loads(raw) if raw else {}


def _normalize_rect(rect: pymupdf.Rect | None) -> dict[str, float] | None:
    if rect is None:
        return None
    return {
        "x": float(rect.x0),
        "y": float(rect.y0),
        "width": float(rect.width),
        "height": float(rect.height),
    }


def _to_rect(candidate: Any) -> pymupdf.Rect | None:
    if candidate is None:
        return None
    if isinstance(candidate, pymupdf.Rect):
        return candidate
    quad_rect = getattr(candidate, "rect", None)
    if isinstance(quad_rect, pymupdf.Rect):
        return quad_rect
    try:
        return pymupdf.Rect(candidate)
    except Exception:
        return None


def _normalize_rect_list(rects: list[Any]) -> list[dict[str, float]]:
    normalized: list[dict[str, float]] = []
    for rect in rects:
        safe_rect = _to_rect(rect)
        if safe_rect is not None:
            normalized.append(_normalize_rect(safe_rect))
    return normalized


def _ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _write_cache_bytes(path: Path, payload: bytes) -> None:
    _ensure_directory(path.parent)
    path.write_bytes(payload)


def _read_cache_bytes(path: Path) -> bytes | None:
    if not path.exists():
        return None
    return path.read_bytes()


def _open_page(payload: dict[str, Any]) -> tuple[pymupdf.Document, pymupdf.Page, int]:
    document_path = str(payload["documentPath"])
    page_number = int(payload["pageNumber"])
    document = pymupdf.open(document_path)
    safe_page = max(1, min(page_number, document.page_count))
    page = document[safe_page - 1]
    return document, page, safe_page


def health(payload: dict[str, Any]) -> dict[str, Any]:
    document_id = str(payload["documentId"])
    try:
        document = pymupdf.open(str(payload["documentPath"]))
        page_count = document.page_count
        document.close()
        return {
            "workerAvailable": True,
            "documentId": document_id,
            "available": True,
            "pageCount": page_count,
        }
    except Exception as exc:
        return {
            "workerAvailable": True,
            "documentId": document_id,
            "available": False,
            "error": str(exc),
        }


def locate_anchor(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("bbox"):
        return {
            "pageNumber": int(payload["pageNumber"]),
            "bbox": payload["bbox"],
            "rects": [payload["bbox"]],
            "bboxSource": "candidate",
        }

    document, page, safe_page = _open_page(payload)
    try:
        text_anchor = payload.get("textAnchor") or {}
        candidates: list[tuple[str, str]] = []
        exact = str(text_anchor.get("exact") or "").strip()
        excerpt = str(payload.get("excerpt") or "").strip()
        prefix = str(text_anchor.get("prefix") or "").strip()

        if exact:
            candidates.append(("pymupdf_exact", exact))
        if excerpt:
            candidates.append(("pymupdf_excerpt", excerpt[:220]))
        if prefix:
            candidates.append(("pymupdf_prefix", prefix[:120]))

        for source, needle in candidates:
            if not needle:
                continue
            rects = page.search_for(needle, quads=True)
            if not rects:
                rects = page.search_for(needle)
            normalized_rects = _normalize_rect_list(rects)
            if normalized_rects:
                merged = pymupdf.Rect(normalized_rects[0]["x"], normalized_rects[0]["y"], normalized_rects[0]["x"] + normalized_rects[0]["width"], normalized_rects[0]["y"] + normalized_rects[0]["height"])
                for rect in normalized_rects[1:]:
                    merged |= pymupdf.Rect(rect["x"], rect["y"], rect["x"] + rect["width"], rect["y"] + rect["height"])
                return {
                    "pageNumber": safe_page,
                    "bbox": _normalize_rect(merged),
                    "rects": normalized_rects,
                    "bboxSource": source,
                    "matchedText": needle,
                }

        return {
            "pageNumber": safe_page,
            "bbox": None,
            "rects": [],
            "bboxSource": "unavailable",
        }
    finally:
        document.close()


def page_images(payload: dict[str, Any]) -> dict[str, Any]:
    document, page, safe_page = _open_page(payload)
    try:
        images = []
        cache_root = Path(str(payload.get("cacheDir") or "")).resolve()
        document_id = str(payload.get("documentId") or "manual")
        index = 0
        seen_xrefs: set[int] = set()

        for image_entry in page.get_images(full=True):
            xref = int(image_entry[0])
            if xref <= 0 or xref in seen_xrefs:
                continue
            seen_xrefs.add(xref)

            rects = page.get_image_rects(xref)
            bbox = _to_rect(rects[0]) if rects else pymupdf.Rect(0, 0, 0, 0)
            extracted = document.extract_image(xref)
            image_bytes = extracted.get("image")
            image_ext = str(extracted.get("ext") or "png").lower()
            mime_type = extracted.get("smask")
            mime_guess = mimetypes.guess_type(f"image.{image_ext}")[0]
            mime_type = mime_guess or "image/png"
            if not image_bytes:
                continue

            cache_key = hashlib.sha1(
                f"{document_id}:{safe_page}:xref:{xref}".encode("utf-8")
            ).hexdigest()[:16]
            cache_path = (
                cache_root
                / document_id
                / "page-images"
                / f"page-{safe_page:03d}"
                / f"{cache_key}.{image_ext}"
            )
            cached_bytes = _read_cache_bytes(cache_path)
            if cached_bytes is None:
                cached_bytes = image_bytes
                _write_cache_bytes(cache_path, cached_bytes)

            images.append(
                {
                    "id": f"page-{safe_page}-embedded-{xref}",
                    "pageNumber": safe_page,
                    "bbox": _normalize_rect(bbox) or _normalize_rect(pymupdf.Rect(0, 0, 0, 0)),
                    "mimeType": mime_type,
                    "dataUrl": f"data:{mime_type};base64,"
                    + base64.b64encode(cached_bytes).decode("ascii"),
                    "extractionMode": "embedded",
                }
            )
            index += 1
            if index >= 8:
                break

        if images:
            return {"images": images}

        text_dict = page.get_text("dict")
        index = 0
        for block in text_dict.get("blocks", []):
            if block.get("type") != 1:
                continue
            bbox = pymupdf.Rect(block["bbox"])
            bbox_key = f"{bbox.x0:.2f}-{bbox.y0:.2f}-{bbox.x1:.2f}-{bbox.y1:.2f}"
            cache_key = hashlib.sha1(
                f"{document_id}:{safe_page}:block:{index}:{bbox_key}".encode("utf-8")
            ).hexdigest()[:16]
            cache_path = (
                cache_root
                / document_id
                / "page-images"
                / f"page-{safe_page:03d}"
                / f"{cache_key}.png"
            )
            png_bytes = _read_cache_bytes(cache_path)
            if png_bytes is None:
                pix = page.get_pixmap(clip=bbox, dpi=144, alpha=False)
                png_bytes = pix.tobytes("png")
                _write_cache_bytes(cache_path, png_bytes)
            images.append(
                {
                    "id": f"page-{safe_page}-image-{index}",
                    "pageNumber": safe_page,
                    "bbox": _normalize_rect(bbox),
                    "mimeType": "image/png",
                    "dataUrl": "data:image/png;base64,"
                    + base64.b64encode(png_bytes).decode("ascii"),
                    "extractionMode": "page_clip_fallback",
                }
            )
            index += 1
            if index >= 8:
                break
        return {"images": images}
    finally:
        document.close()


OPERATIONS = {
    "health": health,
    "locate_anchor": locate_anchor,
    "page_images": page_images,
}


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("operation required")

    operation = sys.argv[1]
    if operation not in OPERATIONS:
        raise SystemExit(f"unsupported operation: {operation}")

    payload = _read_payload()
    result = OPERATIONS[operation](payload)
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()

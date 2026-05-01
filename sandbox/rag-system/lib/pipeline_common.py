import hashlib
import json
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


ROOT_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = ROOT_DIR / "artifacts"
RENDERED_PAGES_DIR = ARTIFACTS_DIR / "rendered_pages"
SCHEMAS_DIR = ROOT_DIR / "schemas"

DEFAULT_EDITION_ID = "edition-2026"
DEFAULT_DOCUMENT_ID = "manual-claseb-2026"
DEFAULT_MANUAL_PATH = ROOT_DIR / "manual_2026.pdf"
DEFAULT_BUILD_NAMESPACE = "manual-foundry"
VISUAL_BLOCK_PREFIX = "[VISUAL]:"

NOISE_BLOCK_VALUES = {"", "---", "```", "```markdown", "[VIS:", "[VIS]", "[VISUAL]"}
FAKE_IMAGE_PATTERNS = (
    "example.com",
    "image_placeholder",
    "placeholder",
)
MARKDOWN_IMAGE_PATTERN = re.compile(r"!\[[^\]]*]\([^)]*\)")

DEFAULT_CHAPTER_MAP = [
    {"chapterId": "chapter-1", "title": "Los siniestros de tránsito", "pageStart": 6, "pageEnd": 9},
    {"chapterId": "chapter-2", "title": "Los principios de la conducción", "pageStart": 11, "pageEnd": 31},
    {"chapterId": "chapter-3", "title": "Convivencia vial", "pageStart": 33, "pageEnd": 35},
    {"chapterId": "chapter-4", "title": "La persona en el tránsito", "pageStart": 37, "pageEnd": 66},
    {"chapterId": "chapter-5", "title": "Las y los usuarios vulnerables", "pageStart": 68, "pageEnd": 75},
    {"chapterId": "chapter-6", "title": "Normas de circulación", "pageStart": 77, "pageEnd": 107},
    {"chapterId": "chapter-7", "title": "Conducción en circunstancias especiales", "pageStart": 109, "pageEnd": 125},
    {"chapterId": "chapter-8", "title": "Conducción eficiente", "pageStart": 127, "pageEnd": 134},
    {"chapterId": "chapter-9", "title": "Informaciones importantes", "pageStart": 136, "pageEnd": 148},
]

DEFAULT_MODELS = {
    "visionModel": "qwen3-VL:4B-Instruct",
    "embedModel": "mxbai-embed-large",
    "generatorModel": "qwen3:4B-Instruct",
    "verifierModel": "qwen3:4B-Instruct",
}


@dataclass(frozen=True)
class BuildPaths:
    build_dir: Path
    manifest_path: Path
    page_artifacts_path: Path
    knowledge_units_path: Path
    vector_path: Path
    vector_mapping_path: Path
    question_candidates_path: Path
    evaluation_report_path: Path
    review_export_path: Path
    quarantine_dir: Path
    indexes_dir: Path
    candidates_dir: Path
    rejected_candidates_dir: Path
    review_export_dir: Path
    pages_index_path: Path
    units_index_path: Path
    candidates_index_path: Path
    retry_report_path: Path


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    normalized = normalize_for_matching(value)
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def build_id_for_manual(manual_year: int, manual_path: Path, namespace: str = DEFAULT_BUILD_NAMESPACE) -> str:
    manual_hash = sha256_file(manual_path)[:12] if manual_path.exists() else "missing-manual"
    return f"{namespace}-{manual_year}-{manual_hash}"


def get_build_paths(build_id: str) -> BuildPaths:
    build_dir = ensure_directory(ARTIFACTS_DIR / build_id)
    candidates_dir = build_dir / "candidates"
    return BuildPaths(
        build_dir=build_dir,
        manifest_path=build_dir / "manual-build-manifest.json",
        page_artifacts_path=build_dir / "page-artifacts.json",
        knowledge_units_path=build_dir / "knowledge-units.json",
        vector_path=build_dir / "knowledge-unit-vectors.npy",
        vector_mapping_path=build_dir / "knowledge-unit-vector-mapping.json",
        question_candidates_path=build_dir / "question-candidates.json",
        evaluation_report_path=build_dir / "evaluation-report.json",
        review_export_path=build_dir / "review-export.json",
        quarantine_dir=build_dir / "quarantine",
        indexes_dir=build_dir / "indexes",
        candidates_dir=candidates_dir,
        rejected_candidates_dir=candidates_dir / "rejected",
        review_export_dir=build_dir / "review-export",
        pages_index_path=build_dir / "indexes" / "pages-index.json",
        units_index_path=build_dir / "indexes" / "units-index.json",
        candidates_index_path=build_dir / "indexes" / "candidates-index.json",
        retry_report_path=build_dir / "retry-report.json",
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def save_json(path: Path, payload: Any) -> None:
    ensure_directory(path.parent)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def load_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_jsonl(path: Path, rows: Iterable[dict]) -> int:
    ensure_directory(path.parent)
    count = 0
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")))
            handle.write("\n")
            count += 1
    return count


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if stripped:
                rows.append(json.loads(stripped))
    return rows


def artifact_relative_path(path_value: str | Path | None) -> str | None:
    if not path_value:
        return None
    path = Path(path_value)
    try:
        resolved = path.resolve()
        return resolved.relative_to(ROOT_DIR).as_posix()
    except Exception:
        return str(path_value).replace("\\", "/")


def get_chapter_entry_for_page(page_number: int, chapter_map: list[dict[str, Any]]) -> dict[str, Any] | None:
    for entry in chapter_map:
        if entry["pageStart"] <= page_number <= entry["pageEnd"]:
            return entry
    return None


def normalize_for_matching(value: str) -> str:
    replacements = str.maketrans(
        {
            "á": "a",
            "é": "e",
            "í": "i",
            "ó": "o",
            "ú": "u",
            "ñ": "n",
            "Á": "a",
            "É": "e",
            "Í": "i",
            "Ó": "o",
            "Ú": "u",
            "Ñ": "n",
        }
    )
    return re.sub(r"\s+", " ", (value or "").translate(replacements).lower()).strip()


def remove_markdown_image_markup(text: str) -> tuple[str, bool]:
    found = False

    def replace(match: re.Match[str]) -> str:
        nonlocal found
        found = True
        label = re.match(r"!\[([^\]]*)]", match.group(0))
        return label.group(1).strip() if label else ""

    cleaned = MARKDOWN_IMAGE_PATTERN.sub(replace, text or "")
    cleaned = re.sub(
        r"!\[([^\]]+)](?=\s|:|$)",
        lambda match: mark_simple_image(match),
        cleaned,
    )
    return cleaned, found


def mark_simple_image(match: re.Match[str]) -> str:
    return match.group(1).strip()


def is_fake_or_placeholder_text(text: str) -> bool:
    lowered = normalize_for_matching(text)
    return any(pattern in lowered for pattern in FAKE_IMAGE_PATTERNS)


def strip_markdown_fences(text: str) -> tuple[str, bool]:
    source = (text or "").strip()
    changed = False

    def set_changed() -> str:
        nonlocal changed
        changed = True
        return ""

    source = re.sub(r"^```(?:markdown|json)?\s*", lambda _: set_changed(), source, flags=re.IGNORECASE)
    source = re.sub(r"\s*```$", lambda _: set_changed(), source)

    return source.strip(), changed


def clean_block_text(text: str) -> tuple[str, list[str]]:
    issues: list[str] = []
    cleaned = (text or "").strip()
    if cleaned.startswith(VISUAL_BLOCK_PREFIX):
        cleaned = cleaned[len(VISUAL_BLOCK_PREFIX) :].strip()

    cleaned, stripped_fence = strip_markdown_fences(cleaned)
    if stripped_fence:
        issues.append("markdown_fence_removed")

    cleaned, removed_image_markup = remove_markdown_image_markup(cleaned)
    if removed_image_markup:
        issues.append("markdown_image_removed")

    if is_fake_or_placeholder_text(cleaned):
        issues.append("fake_image_url_removed")
        cleaned = re.sub(r"https?://\S+", "", cleaned)
        cleaned = cleaned.replace("image_placeholder", "").strip()

    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if normalize_for_matching(cleaned) in NOISE_BLOCK_VALUES:
        issues.append("parser_noise_removed")
        cleaned = ""
    if cleaned.startswith("[VIS"):
        issues.append("malformed_visual_tag_removed")
        cleaned = ""

    return cleaned, issues


def compute_parser_confidence(block_type: str, text: str, issues: list[str] | None = None) -> float:
    issue_set = set(issues or [])
    if not text.strip():
        return 0.0
    if issue_set & {"fake_image_url_removed", "malformed_visual_tag_removed", "parser_noise_removed"}:
        return 0.2
    if block_type == "visual":
        return 0.68 if len(text.split()) >= 6 else 0.35
    if block_type == "heading":
        return 0.82
    if len(text.split()) < 6:
        return 0.35
    if block_type in {"table", "list"}:
        return 0.86
    return 0.93


def split_text_into_blocks(text: str) -> list[dict[str, Any]]:
    normalized = re.sub(r"\r\n?", "\n", text or "").strip()
    if not normalized:
        return []

    raw_blocks = [block.strip() for block in re.split(r"\n{2,}", normalized) if block.strip()]
    blocks: list[dict[str, Any]] = []

    for raw_block in raw_blocks:
        block_type = "paragraph"
        explicit_visual = raw_block.startswith(VISUAL_BLOCK_PREFIX)
        block, issues = clean_block_text(raw_block)
        if not block:
            continue
        if explicit_visual:
            block_type = "visual"

        if block_type != "visual":
            if "|" in block:
                block_type = "table"
            elif len(block.split()) <= 10 and block[:1].isupper():
                block_type = "heading"
            elif block.startswith(("-", "*", "•")):
                block_type = "list"

        blocks.append(
            {
                "blockId": f"block-{len(blocks) + 1:03d}",
                "type": block_type,
                "text": block,
                "bbox": None,
                "confidence": compute_parser_confidence(block_type, block, issues),
                "parserConfidence": compute_parser_confidence(block_type, block, issues),
                "parserIssues": issues,
            }
        )

    return blocks


def summarize_page_text(text: str, limit: int = 280) -> str:
    collapsed = re.sub(r"\s+", " ", text or "").strip()
    return collapsed[:limit].rstrip() if len(collapsed) > limit else collapsed


def detect_visual_keywords(text: str) -> list[str]:
    lowered = normalize_for_matching(text)
    keywords = [
        "senal",
        "figura",
        "imagen",
        "panel",
        "tablero",
        "testigo",
        "luz",
        "semaforo",
        "ilustracion",
        "diagrama",
    ]
    return [keyword for keyword in keywords if keyword in lowered]


def extract_numeric_values(text: str) -> list[dict[str, Any]]:
    matches = re.finditer(
        r"(\d+[.,]?\d*)\s*(km/h|kmh|%|años|anos|segundos|segundo|metros|m|cm|mg/l|g/l)?",
        text,
        re.IGNORECASE,
    )
    values = []
    for match in matches:
        value = match.group(1)
        unit = match.group(2)
        values.append(
            {
                "value": value.replace(",", "."),
                "unit": unit.lower() if unit else None,
                "raw": match.group(0),
            }
        )
    return values


def extract_entities(text: str) -> list[str]:
    candidates = re.findall(r"\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]?[a-záéíóúñ]{2,})*", text or "")
    seen: list[str] = []
    for candidate in candidates:
        if candidate not in seen:
            seen.append(candidate)
    return seen[:12]


def build_text_anchor(text: str, limit: int = 220) -> dict[str, str]:
    collapsed = summarize_page_text(text, limit=limit)
    return {
        "exact": collapsed,
        "prefix": collapsed[:60],
        "suffix": collapsed[-60:] if len(collapsed) > 60 else collapsed,
    }


def retry_call(fn, attempts: int = 3, sleep_seconds: float = 1.0):
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except Exception as error:  # noqa: BLE001
            last_error = error
            if attempt >= attempts:
                break
            time.sleep(sleep_seconds * attempt)
    raise last_error

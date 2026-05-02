import re
from collections import Counter, defaultdict

from build_manifest import build_manifest
from lib.pipeline_common import (
    build_text_anchor,
    detect_visual_keywords,
    extract_entities,
    extract_numeric_values,
    get_build_paths,
    load_json,
    save_json,
    slugify,
    summarize_page_text,
)


MIN_UNIT_CONFIDENCE = 0.5
MAX_ASSETS_PER_UNIT = 6
VISUAL_REFERENCE_PATTERNS = (
    "señal",
    "senal",
    "la señal anterior",
    "la senal anterior",
    "figura",
    "imagen",
    "cuadro",
    "tabla",
    "según la señal",
    "segun la señal",
    "según la senal",
    "segun la senal",
)


def infer_unit_type(block_type: str, text: str) -> str:
    if block_type == "visual":
        return "visual_identification"

    lowered = text.lower()

    if re.search(
        r"\b(debe|deben|prohibido|prohibida|obligatorio|obligatoria|permitido|permitida|tienen que|estan obligados|están obligados)\b",
        lowered,
    ):
        return "rule"

    if re.search(
        r"\b(se define|definición|definicion|consiste en|se refiere a|es un|es una|significa)\b",
        lowered,
    ):
        return "definition"

    if re.search(
        r"\b(excepto|salvo|a menos que|sin embargo|con la excepción|con la excepcion)\b",
        lowered,
    ):
        return "exception"

    if re.search(
        r"\b(procedimiento|pasos|qué hacer|que hacer|cómo actuar|como actuar|instrucciones)\b",
        lowered,
    ):
        return "procedure"

    if extract_numeric_values(text):
        return "fact"

    return "scenario"


def build_generator_hints(unit_type: str, text: str, visual_required: bool) -> dict:
    hints = {
        "forbiddenDistractors": [],
        "recommendedQuestionStyles": [],
        "avoidTrivialPhrasing": True,
    }

    if unit_type in {"rule", "exception"}:
        hints["recommendedQuestionStyles"] = ["direct_rule_recall", "contrast_confusion_distractors"]
        hints["forbiddenDistractors"] = ["all_of_the_above", "none_of_the_above"]
    elif unit_type == "fact":
        hints["recommendedQuestionStyles"] = ["numeric_recall", "applied_scenario"]
    elif unit_type == "visual_identification":
        hints["recommendedQuestionStyles"] = ["visual_recognition", "mixed_context"]
    elif unit_type == "procedure":
        hints["recommendedQuestionStyles"] = ["applied_scenario", "procedure_order"]
    else:
        hints["recommendedQuestionStyles"] = ["applied_scenario"]

    if visual_required and "visual_recognition" not in hints["recommendedQuestionStyles"]:
        hints["recommendedQuestionStyles"].append("visual_recognition")

    if re.search(r"\bsi\b.*\bentonces\b", text.lower()):
        hints["recommendedQuestionStyles"].append("applied_scenario")

    return hints


def is_visual_marker_block(block: dict) -> bool:
    text = (block.get("text") or "").strip().lower()
    return text.startswith("![") or "https://example.com/image" in text


def has_visual_reference(text: str) -> bool:
    lowered = (text or "").lower()
    return any(pattern in lowered for pattern in VISUAL_REFERENCE_PATTERNS)


def infer_visual_dependency(
    page_blocks: list[dict],
    index: int,
    block: dict,
    valid_visual_asset_ids: list[str],
) -> str:
    if block["type"] == "visual" and valid_visual_asset_ids:
        return "required"

    block_text = (block.get("text") or "").strip()
    references_visual = has_visual_reference(block_text)
    previous_block = page_blocks[index - 1] if index > 0 else None
    next_block = page_blocks[index + 1] if index + 1 < len(page_blocks) else None
    previous_two = page_blocks[index - 2] if index > 1 else None

    adjacent_visual = any(
        candidate is not None and is_visual_marker_block(candidate)
        for candidate in (previous_block, next_block)
    )
    heading_then_visual = (
        previous_two is not None
        and previous_block is not None
        and is_visual_marker_block(previous_block)
        and has_visual_reference(previous_two.get("text", ""))
    )

    if valid_visual_asset_ids and references_visual and (adjacent_visual or heading_then_visual):
        return "required"
    if valid_visual_asset_ids and (adjacent_visual or heading_then_visual or references_visual):
        return "linked"
    return "none"


def build_knowledge_units(manifest: dict) -> list[dict]:
    build_paths = get_build_paths(manifest["buildId"])
    page_artifacts = load_json(build_paths.page_artifacts_path, default=[]) or []
    units = []

    for page in page_artifacts:
        chapter_id = page["chapterId"]
        valid_visual_asset_ids = [
            asset["assetId"]
            for asset in page["visualAssets"][1:]
            if (asset.get("caption") or asset.get("visionDescription"))
        ][:MAX_ASSETS_PER_UNIT]

        page_blocks = page["ocrBlocks"]
        for zero_index, block in enumerate(page_blocks):
            block_text = block["text"].strip()
            if len(block_text) < 80:
                continue
            parser_confidence = block.get("parserConfidence", block.get("confidence", 0))
            if parser_confidence < MIN_UNIT_CONFIDENCE:
                continue
            if block["type"] == "heading":
                continue

            unit_type = infer_unit_type(block["type"], block_text)
            visual_keywords = detect_visual_keywords(block_text)
            visual_dependency = infer_visual_dependency(
                page_blocks,
                zero_index,
                block,
                valid_visual_asset_ids,
            )
            visual_required = visual_dependency == "required"
            visual_mode = (
                "required"
                if visual_dependency == "required"
                else "optional"
                if visual_dependency == "linked" or visual_keywords
                else "none"
            )

            display_index = zero_index + 1
            block_suffix = str(block.get("blockId") or f"block-{display_index:03d}").replace("block-", "")
            unit_id = f"{page['pageId']}-unit-{block_suffix}"
            topic_title = summarize_page_text(block_text, limit=90)
            topic_key = slugify(topic_title) or f"unit-{display_index:03d}"
            numeric_values = extract_numeric_values(block_text)
            unit_issues = []
            if visual_mode == "optional":
                unit_issues.append("visual_keyword_text_only")
            if visual_dependency == "linked":
                unit_issues.append("visual_dependency_linked")
            if visual_required and not valid_visual_asset_ids:
                unit_issues.append("visual_required_without_valid_asset")

            units.append(
                {
                    "unitId": unit_id,
                    "editionId": manifest["editionId"],
                    "chapterId": chapter_id,
                    "sourceDocumentId": manifest["sourceDocument"]["documentId"],
                    "pageRange": {"start": page["pageNumber"], "end": page["pageNumber"]},
                    "unitType": unit_type,
                    "topicKey": topic_key,
                    "topicTitle": topic_title,
                    "canonicalStatement": summarize_page_text(block_text, limit=180),
                    "pageContextSummary": page["pageSummary"],
                    "supportingText": block_text,
                    "groundingSpans": [
                        {
                            "pageId": page["pageId"],
                            "pageNumber": page["pageNumber"],
                            "blockId": block["blockId"],
                            "excerpt": summarize_page_text(block_text, limit=320),
                            "textAnchor": build_text_anchor(block_text),
                            "bbox": block.get("bbox"),
                            "bboxSource": "pymupdf_text_search_pending",
                        }
                    ],
                    "visualSupport": {
                        "mode": visual_mode,
                        "required": visual_required,
                        "assetIds": valid_visual_asset_ids if visual_dependency != "none" else [],
                        "visualQuestionTypes": ["visual_recognition", "mixed_context"] if visual_dependency != "none" else [],
                    },
                    "visualDependency": visual_dependency,
                    "entities": extract_entities(block_text),
                    "numericValues": numeric_values,
                    "aliases": visual_keywords,
                    "difficultyHints": {
                        "estimatedLevel": "medium" if numeric_values or visual_dependency != "none" else "easy",
                        "questionTargets": 4 if visual_dependency != "none" or unit_type in {"rule", "fact"} else 2,
                    },
                    "generatorHints": build_generator_hints(unit_type, block_text, visual_dependency != "none"),
                    "safetyFlags": {
                        "ambiguous": len(block_text.split()) < 20,
                        "outdated": False,
                        "low_extraction_confidence": (block.get("confidence") or 0) < 0.6,
                    },
                    "unitIssues": unit_issues,
                    "buildConfidence": parser_confidence,
                }
            )

    save_json(build_paths.knowledge_units_path, units)
    chapter_counts = Counter(unit["chapterId"] for unit in units)
    type_counts = Counter(unit["unitType"] for unit in units)
    page_counts: dict[str, int] = defaultdict(int)
    for unit in units:
        page_counts[f"{unit['chapterId']}:p{unit['pageRange']['start']:03d}"] += 1
    save_json(
        build_paths.units_index_path,
        {
            "unitCount": len(units),
            "chapterCounts": dict(chapter_counts),
            "unitTypeCounts": dict(type_counts),
            "pageCounts": dict(page_counts),
        },
    )
    return units


if __name__ == "__main__":
    manifest = build_manifest()
    knowledge_units = build_knowledge_units(manifest)
    print(f"Derived {len(knowledge_units)} knowledge units for {manifest['buildId']}.")

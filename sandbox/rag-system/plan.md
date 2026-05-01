# Sandbox RAG Foundry Stabilization Plan

## Goal

Turn `sandbox/rag-system` into a reliable annual manual-to-catalog foundry that can parse the yearly manual, derive knowledge units, generate candidate questions, verify them, and export review-ready JSONL packages for `/Admin`.

## Milestones

1. Parser sanitation
   - Treat `[VISUAL]:` as the only authority for visual blocks.
   - Remove parser noise, fake image URLs, placeholders, markdown fences, and malformed tags before page artifacts are trusted.
   - Replace fixed extraction confidence with parser-derived confidence.

2. Page repair and quarantine
   - Preserve original builds for audit.
   - Create repaired derivative builds through `repair_foundry_artifacts.py`.
   - Report anomaly pages and retry targets through quarantine and retry reports.

3. Knowledge unit rebuild
   - Rebuild units only from sanitized pages.
   - Skip low-value blocks and heading-only content.
   - Mark visual support as `none`, `optional`, or `required`.
   - Require structurally valid visual blocks before assigning required media.

4. JSONL artifacts
   - Write per-chapter candidate and review export JSONL files.
   - Keep small index/manifest files for lazy loading.
   - Avoid large monolithic files for regular inspection and future `/Admin` loading.

5. Candidate verification
   - Run deterministic verification first.
   - Validate unit, block, asset, and page provenance.
   - Optionally run the local semantic verifier with `RAG_ENABLE_SEMANTIC_VERIFIER=1`.
   - Continue on semantic verifier failure and record retry targets.

6. PDF-localizable grounding
   - Preserve page/block/text anchors in knowledge units.
   - Use `locate_pdf_grounding.py` to enrich spans with PyMuPDF text-search bboxes where possible.
   - Fall back to page-level grounding when text search cannot locate an excerpt.

7. `/Admin` generated build lane
   - Load generated review-export manifests lazily by chapter.
   - Feed candidates into the existing local draft import workflow.
   - Preserve sandbox provenance and grounding anchors in imported catalog drafts.

## Current Commands

Repair an existing build without rerunning VLM extraction:

```powershell
python repair_foundry_artifacts.py --build-id manual-foundry-2026-31abbf7de7c9
```

Run the full foundry for a fresh manual build:

```powershell
python run_foundry_build.py
```

Enable semantic verification for a verification pass:

```powershell
$env:RAG_ENABLE_SEMANTIC_VERIFIER="1"
python verify_candidates.py
```

Locate grounding spans in the PDF:

```powershell
python locate_pdf_grounding.py --build-id manual-foundry-2026-31abbf7de7c9-repaired
```

## Validation Checklist

- `python -m py_compile *.py lib\*.py`
- `npm run build`
- repaired page 96 has no empty visual blocks
- text starting with `Señal` remains text unless explicitly tagged `[VISUAL]:`
- no fake image URLs reach units, candidates, or review export
- per-chapter JSONL files are generated
- retry report identifies repair targets by page, unit, chapter, or candidate

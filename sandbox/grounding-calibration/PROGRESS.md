# Sandbox Progress

## 2026-04-22 Current staging baseline

- Chapter-likelihood retrieval layer is active in the sandbox and remains non-production.
- Support refinement / evidence expansion is active for blind-mode validation.
- Gold suites are complete for Chapters 1-9.
- Blind coverage now includes:
  - `blind_test_dataset.json`
  - `blind_test_dataset_v2.json`
- Synthetic negatives remain in `synthetic_negative_cases.json`.
- This sandbox baseline has now been promoted into production runtime code under `src/lib/grounding/`.
- The sandbox remains the non-regression gate and yearly calibration system for future manual editions.

## Current benchmark baseline

- Gold suites:
  - Chapter 1-9: `top1Precision = 1`
  - Chapter 1-9: `answerBearingPassRate = 1`
- Blind suites:
  - `55` positive blind cases
  - `5` synthetic negative cases
  - `precisionAt1 = 1`
  - `recallAt5 = 1`
  - `answerBearingPassRate = 1`
  - `mustBeWindowPassRate = 1`
  - `chapterPredictionAccuracy = 1`
  - `negativeLowConfidencePassRate = 1`
  - `verifiedFromPdfCaseCount = 29`
  - `verifiedFromPdfWithoutOverridePassRate = 1`
  - `extractionBlockedCaseCount = 0`

## Audit inputs

- Human-audit chapter PDFs live in `resources/books/`.
- Retrieval still runs against `data/manual-knowledge/2026/chapters/*.json`.
- The chapter PDFs are not a replacement retrieval corpus in this phase.

## Known extraction defect lane

- `resources/extraction-issues.json` tracks known mismatches between chapter PDFs and segmented text.
- Current known issue:
  - `issue-2026-ch8-p129-s4-truncated-consumption`
- Related sandbox-only override:
  - `resources/segment-overrides.json`

## Operational notes

- Benchmark files should keep `reviewStatus` and `sourceAuditFile` for new blind cases.
- Use `verified_from_pdf` for cases audited against the curated chapter PDFs.
- Use `needs_extraction_repair` only when the PDF is correct but the segmented text still needs override support.
- Do not relax the current gate to accommodate new cases. Fix the case, extraction, or retrieval logic instead.

## Reuse for 2027

- Preserve this folder as the annual calibration workbench.
- For a 2027 manual refresh:
  - add new chapter PDFs to `resources/books/`
  - regenerate chapter stats
  - rebuild gold/blind/negative cases against the new versioned chapter corpus
  - re-evaluate extraction defects separately from ranking defects
- Production changes for 2027 should start here first, then be promoted only after the sandbox gate is green again.

## 2026-04-22 Advisory facts and fact builder baseline

- Production facts are now being repositioned as advisory normalization aids rather than rejection authorities.
- The sandbox now owns the future fact-generation path through:
  - `fact-harvester.mjs`
  - `generated/fact-proposals-2026.json`
- Harvested fact proposals are intended to support:
  - yearly manual refreshes
  - fact curation review
  - future safe-question authoring constraints
- Current operating rule:
  - harvested facts are candidate data, not automatic production truth
- Current harvested baseline:
  - `generated/fact-proposals-2026.json`
  - `518` proposed facts from the 2026 segmented manual corpus

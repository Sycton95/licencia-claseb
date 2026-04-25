# Grounding Calibration Workbench

Isolated sandbox for paragraph-accurate grounding experiments. This workbench is the staging environment for proving retrieval, support selection, and confidence behavior before any future production grounding changes.

## Purpose

- test retrieval and reranking logic outside the production import-review engine
- maintain tracked benchmark fixtures, lexical resources, schemas, and audit rules
- preserve generated runs and scratch outputs as ignored artifacts
- keep a reusable yearly calibration workflow for future manual versions such as 2027

## Current baseline

- Gold suites:
  - `benchmark/chapter1_gold_cases.json`
  - `benchmark/chapter2_gold_cases.json`
  - `benchmark/chapter3_gold_cases.json`
  - `benchmark/chapter4_gold_cases.json`
  - `benchmark/chapter5_gold_cases.json`
  - `benchmark/chapter6_gold_cases.json`
  - `benchmark/chapter7_gold_cases.json`
  - `benchmark/chapter8_gold_cases.json`
  - `benchmark/chapter9_gold_cases.json`
- Blind suites:
  - `benchmark/blind_test_dataset.json`
  - `benchmark/blind_test_dataset_v2.json`
- Negative suite:
  - `benchmark/synthetic_negative_cases.json`
- Current gate:
  - all Chapter 1-9 gold suites at `top1Precision = 1` and `answerBearingPassRate = 1`
  - blind positives `>= 50`
  - `precisionAt1 >= 0.9`
  - `recallAt5 >= 0.95`
  - `chapterPredictionAccuracy > 0.9`
  - `negativeLowConfidencePassRate = 1`
  - `verifiedFromPdfCaseCount >= 25`
  - `verifiedFromPdfWithoutOverridePassRate = 1`
  - `extractionBlockedCaseCount = 0`

## Tracked contents

- `benchmark/`: human-reviewed gold, blind, and negative cases
- `resources/`: stopwords, aliases, facts, unit rules, chapter stats, extraction issues, and sandbox overrides
- `resources/books/`: curated per-chapter PDF slices used as human audit inputs
- `schemas/`: sandbox-only JSON schemas
- `lib/`: standalone retrieval, chapter-likelihood, reranking, and support refinement pipeline
- `test-grounding-calibration.mjs`: benchmark runner
- `generate-chapter-stats.mjs`: chapter signature generator
- `fact-harvester.mjs`: sandbox fact proposal generator
- `PROGRESS.md`: sandbox-specific change log and operating notes

## Ignored contents

- `runs/`: generated benchmark logs
- `tmp/`: scratch files
- `exports/`: ad hoc review exports
- `research/raw/`: uncurated external lexical material

## Source of truth vs derived artifacts

- Source of truth for retrieval corpus:
  - `data/manual-knowledge/2026/chapters/*.json`
- Source of truth for human audit:
  - `resources/books/chapter*-2026-*.pdf`
- Derived sandbox resources:
- `resources/chapter-stats.json`
- `resources/segment-overrides.json`
- `resources/extraction-issues.json`
- `generated/fact-proposals-2026.json`
- Production relationship:
  - the current production grounding runtime in `src/lib/grounding/` was promoted from this sandbox baseline
  - this sandbox remains the non-regression gate and yearly calibration workbench

## Blind-case curation workflow

1. Select a candidate question from a chapter PDF in `resources/books/`.
2. Validate the answer directly against the chapter PDF.
3. Map the answer to the current `2026` segment id or faithful window id from `data/manual-knowledge/2026/chapters/`.
4. Record:
   - `expectedAnswerText`
   - `requiredPhrases` and/or `requiredNormalizedFacts`
   - `reviewStatus`
   - `sourceAuditFile`
5. If the chapter PDF supports the answer but the segmented corpus is lossy or incomplete:
   - add an entry to `resources/extraction-issues.json`
   - use `segment-overrides.json` only when a narrow sandbox override is justified

## Review status conventions

- `verified_from_pdf`: validated directly from the chapter PDF
- `verified_from_segmented_manual`: validated against the segmented chapter JSON without a separate PDF check
- `needs_extraction_repair`: answer is supported by the chapter PDF, but the segmented extraction still needs repair or override support

## Core sandbox capabilities

- chapter-likelihood scoring from `resources/chapter-stats.json`
- lexical retrieval with bounded chapter boosts
- fact gating and numeric normalization
- post-retrieval support refinement / evidence expansion
- confidence disposition:
  - `grounded`
  - `low_confidence`
  - `no_grounding`

## Commands

- Regenerate chapter signatures:
  - `npm run grounding:chapter-stats`
- Generate harvested fact proposals:
  - `npm run grounding:fact-harvest`
- Run the full sandbox benchmark gate:
  - `npm run grounding:calibration`

## 2027 adaptation path

When the 2027 manual arrives:

1. generate a new versioned manual knowledge pack
2. add curated chapter PDF slices under `resources/books/`
3. rebuild chapter stats
4. port or revalidate gold cases chapter by chapter
5. rebuild the blind and negative suites with explicit `reviewStatus`
6. keep extraction defects separate from retrieval defects
7. regenerate harvested fact proposals before curating the next yearly fact set

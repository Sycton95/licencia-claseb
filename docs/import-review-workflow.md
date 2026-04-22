# Import Review Workflow

Use this workflow for every raw frontier-AI batch before any content merge work.

## Purpose

The review step is deterministic and offline-first. It does not mutate the verified question bank.

The current review pipeline:

1. reads a raw JSON batch from `data/imports/`
2. preserves the raw file unchanged
3. flattens concatenated top-level JSON arrays when needed
4. normalizes low-risk text and formatting drift
5. validates structure, answers, chapter scope, fact consistency, and prompt duplication
6. auto-grounds missing citations from the local manual knowledge pack when confidence is high enough
7. resolves same-batch duplicate clusters by selecting one winner
8. writes per-import review artifacts into `data/import-reviews/<run-name>/`

Before reviewing large batches, rebuild the manual knowledge pack from the local 2026 PDF:

```bash
npm run prepare:manual-knowledge
```

This command reads the checked-in `Libro-ClaseB-2026.pdf` and rewrites:

- `data/manual-knowledge/2026/index.json`
- `data/manual-knowledge/2026/chapters/chapter-*.json`
- `data/manual-knowledge/2026/facts.json`
- `data/manual-knowledge/extracted-pages.json`
- `data/manual-knowledge/segmented-manual.json`
- `data/manual-knowledge/manual-segments.json`
- `data/manual-knowledge/ground-truth.json`
- `data/manual-knowledge/chapter-classifier.json`

The versioned `2026/` directory is now the source of truth. The flat files are still emitted as compatibility outputs during the transition.

## Command

```bash
npm run review:import -- data/imports/chapter-4-batch.json
```

Chapter dry-run example:

```bash
npm run review:import:chapter2
```

Use the Chapter 2 dry-run immediately after regenerating the manual pack. It is the shortest gating pass for grounding recovery before rerunning the full `imported-1-batch.json`.

## Output artifacts

Each reviewed import produces:

- `review-log.json`
- `review-summary.md`
- `accepted-candidates.json`
- `rejected-candidates.json`
- `run-details.json`
- `chapters/<chapter-id>/accepted-candidates.json`

At the root of `data/import-reviews/`, the reviewer also maintains:

- `manifest.json`

## Review decisions

Items are classified as:

- `accepted`
- `accepted_with_warning`
- `rejected`

Accepted items:

- passed structural validation
- passed chapter-scope validation
- are not near-duplicates of the existing bank
- either contain manual grounding already, or were auto-grounded from the local manual pack

Accepted-with-warning items are usually:

- `fact_auto` grounded
- `citation_auto` grounded
- structurally valid but still flagged for operator review

Same-batch near-duplicates no longer reject every item in the cluster. One winner is selected and the remaining candidates are rejected as referenced duplicates.

Rejected items include explicit error codes and messages, for example:

- `chapter_scope_mismatch`
- `duplicate_prompt_existing_bank`
- `referenced_duplicate_in_batch`
- `invalid_single_answer_count`
- `missing_grounding_excerpt`
- `manual_fact_conflict`

## Logged normalizations

The importer may normalize low-risk drift and record it in `review-log.json`, including:

- `chapterId: "4"` -> `chapter-4`
- flattened concatenated JSON arrays
- whitespace cleanup
- line-break normalization
- recoverable mojibake fixes

The raw file in `data/imports/` is never rewritten.

## Operator workflow

1. Generate a chapter-specific JSON batch with the frontier prompt.
2. Drop the raw file into `data/imports/`.
3. Rebuild the manual pack from `Libro-ClaseB-2026.pdf` when the source changes.
4. Run the review command.
5. Read `review-summary.md`.
6. Use only `accepted-candidates.json` for later merge preparation.
7. Use `run-details.json` for rejected-candidate diffs, duplicate winners, and grounding suggestions.
8. Fix, split, or discard `rejected-candidates.json` items before resubmission.

## Current scope windows

Import review uses the formal manual chapter numbering as the source of truth:

- `chapter-1`: pages 6-10
- `chapter-2`: pages 11-32
- `chapter-3`: pages 33-36
- `chapter-4`: pages 37-67
- `chapter-5`: pages 68-76
- `chapter-6`: pages 77-108
- `chapter-7`: pages 109-126
- `chapter-8`: pages 127-135
- `chapter-9`: pages 136-148

Annex pages `149-169` are out of scope for chapter imports and are rejected by default.

## Current state

- The manual knowledge pack is now generated from the local `Libro-ClaseB-2026.pdf` source.
- The reviewer now prefers the versioned knowledge-pack index and chapter files under `data/manual-knowledge/2026/`.
- Review artifacts are split between a lightweight `manifest.json` and per-run `run-details.json`.
- `/admin` consumes the manifest first and lazy-loads run details in a read-only review surface.
- `/admin` also provides a read-only manual browser that lazy-loads versioned chapter segments for local comparison during import review.
- Latest baseline:
  - full `imported-1-batch.json` review: `999` accepted-with-warning, `465` rejected
  - Chapter 2 dry-run: `334` accepted-with-warning, `115` rejected
- Operator note:
  - if recovery drops unexpectedly, regenerate the manual pack first
  - do not treat stale `data/manual-knowledge/*.json` files as authoritative after the PDF changes

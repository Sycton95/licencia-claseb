# Import Review Workflow

Use this workflow for every raw frontier-AI batch before any content merge work.

## Purpose

The review step is deterministic and offline-first. It does not mutate the verified question bank.

The review pipeline:

1. reads a raw JSON batch from `data/imports/`
2. preserves the raw file unchanged
3. normalizes low-risk text and formatting drift
4. validates structure, answers, chapter scope, and prompt duplication
5. writes per-import review artifacts into `data/import-reviews/<batch-name>/`

## Command

```bash
npm run review:import -- data/imports/chapter-4-batch.json
```

## Output artifacts

Each reviewed import produces:

- `review-log.json`
- `review-summary.md`
- `accepted-candidates.json`
- `rejected-candidates.json`

## Review decisions

Items are classified as:

- `accepted`
- `rejected`

Accepted items:

- passed structural validation
- passed chapter-scope validation
- are not duplicates or near-duplicates against the local bank or the same batch

Rejected items include explicit error codes and messages, for example:

- `chapter_scope_mismatch`
- `duplicate_prompt_existing_bank`
- `near_duplicate_prompt_in_batch`
- `invalid_single_answer_count`
- `missing_grounding_excerpt`

## Logged normalizations

The importer may normalize low-risk drift and record it in `review-log.json`, including:

- `chapterId: "4"` -> `chapter-4`
- whitespace cleanup
- line-break normalization
- recoverable mojibake fixes

The raw file in `data/imports/` is never rewritten.

## Operator workflow

1. Generate a chapter-specific JSON batch with the frontier prompt.
2. Drop the raw file into `data/imports/`.
3. Run the review command.
4. Read `review-summary.md`.
5. Use only `accepted-candidates.json` for later merge preparation.
6. Fix, split, or discard `rejected-candidates.json` items before resubmission.

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

## Current limitation

Import review now classifies batches against the formal 9-chapter manual structure.

The runtime question bank still uses the older internal chapter model. That mismatch is a separate migration task and remains out of scope for this verifier fix. Accepted import candidates are valid for manual chapter scope, but they are not automatically merge-ready for the current runtime bank until that chapter-model alignment is completed.

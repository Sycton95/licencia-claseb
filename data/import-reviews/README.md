# Import Review Outputs

This folder stores deterministic review artifacts generated from raw frontier import batches.

Workflow:

1. Rebuild the manual knowledge pack when the PDF source changes with `npm run prepare:manual-knowledge`.
2. Drop a raw batch into `data/imports/`.
3. Run `npm run review:import -- data/imports/<file>.json`.
4. Inspect the generated folder in `data/import-reviews/<run-stem>/`.

Optional gating run:

- `npm run review:import:chapter2`
- use this to measure Chapter 2 recovery before rerunning the full 1,405-item corpus

Generated artifacts:

- `manifest.json`
- `review-log.json`
- `review-summary.md`
- `accepted-candidates.json`
- `rejected-candidates.json`
- `run-details.json`
- `chapters/<chapter-id>/accepted-candidates.json`

Rules:

- Raw files in `data/imports/` remain unchanged.
- Review outputs are staging artifacts only.
- Nothing in this folder should be treated as merged runtime data by itself.
- `manifest.json` is the summary contract for `/admin`.
- `run-details.json` stores the heavy per-run payload: rejected candidates, duplicate clusters, and grounding suggestions.
- The latest bulk review baseline currently lives under:
  - `data/import-reviews/imported-1-batch/`
  - `data/import-reviews/imported-1-batch--chapter-2/`

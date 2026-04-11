# Import Review Outputs

This folder stores deterministic review artifacts generated from raw frontier import batches.

Workflow:

1. Drop a raw batch into `data/imports/`.
2. Run `npm run review:import -- data/imports/<file>.json`.
3. Inspect the generated folder in `data/import-reviews/<file-stem>/`.

Generated artifacts:

- `review-log.json`
- `review-summary.md`
- `accepted-candidates.json`
- `rejected-candidates.json`

Rules:

- Raw files in `data/imports/` remain unchanged.
- Review outputs are staging artifacts only.
- Nothing in this folder should be treated as merged runtime data by itself.

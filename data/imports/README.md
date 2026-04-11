# Raw Frontier Imports

Drop raw frontier-AI JSON batches here before validation and normalization.

Use one file per chapter, for example:

- `chapter-3-batch.json`
- `chapter-4-batch.json`
- `chapter-7-batch-02.json`

Rules:

- Keep raw files unchanged after export from the frontier model.
- Do not place accepted runtime data here.
- Do not edit `src/data/seedContent.ts` or `src/data/sourcePreparation.ts` directly from these files.
- Importer and validator logic should read from this folder first, then produce normalized review output in `data/import-reviews/`.
- Run `npm run review:import -- data/imports/<file>.json` for each dropped batch.

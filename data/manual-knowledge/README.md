# Manual Knowledge Pack

This folder stores the offline knowledge artifacts used by the import review pipeline.

Files:

- `2026/index.json`: source-of-truth manifest for the versioned knowledge pack
- `2026/chapters/chapter-*.json`: chapter-split segment and fact files used for lazy loading and calibrated review
- `2026/facts.json`: versioned aggregate fact export
- `extracted-pages.json`: page-preserving text extracted from the local 2026 PDF
- `segmented-manual.json`: paragraph-like chapter segments derived from the extracted pages
- `ground-truth.json`: hard/soft facts derived from the segmented manual and used for numeric validation
- `chapter-classifier.json`: weighted chapter keywords and ambiguity settings
- `manual-segments.json`: manual citations and grounding excerpts used for review-time grounding and admin suggestions

Compatibility note:

- `data/manual-knowledge/2026/` is now the source of truth.
- The flat files in `data/manual-knowledge/` are still generated as compatibility artifacts for the current reviewer and runtime loaders.

Recommended workflow:

1. Keep the local PDF at `Libro-ClaseB-2026.pdf`
2. Run `npm run prepare:manual-knowledge`
3. Run `npm run review:import -- data/imports/<file>.json`
4. Run `npm run review:import:chapter2` as the first recovery gate for the bulk corpus

Notes:

- The pipeline is Node-only and offline.
- Spanish characters must be preserved end-to-end during extraction and segmentation.
- The reviewer now calibrates lexical grounding against the versioned chapter files with Spanish stopword filtering and stronger chapter-local weighting.
- Chapter 2 recovery depends on these artifacts being rebuilt from the real PDF, not the old starter JSON.
- The checked-in JSON files should be regenerated whenever the manual source changes.
- Current generated baseline from the 2026 PDF:
  - `170` extracted pages
  - `751` manual segments
  - `95` derived facts

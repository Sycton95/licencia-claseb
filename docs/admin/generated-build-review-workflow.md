# Generated Build Review Workflow

## Purpose

This workflow defines how sandbox-generated annual builds should enter `/Admin` without bypassing human review or loading large artifacts into the browser.

## Input Contract

Admin should load generated builds from a review-export manifest.

Minimum manifest behavior:

- identifies the `buildId`, edition, source manual, and generated time
- lists chapters and per-chapter JSONL export files
- provides candidate counts, verifier counts, rejected counts, and visual-audit counts
- points to media/crop assets through portable artifact-relative paths

Admin should never require loading a monolithic `question-candidates.json` or full review export to inspect one chapter.

Production Admin loads curated foundry data from:

```text
data/foundry-builds/<buildId>/manifest.json
data/foundry-builds/<buildId>/review-export/chapter-*.jsonl
```

The loader uses Vite raw dynamic imports for JSONL chapters so one chapter can be loaded without importing the full generated build into the initial bundle.

## Review Flow

1. Reviewer opens the Foundry lane.
2. Admin loads `review-export/manifest.json`.
3. Reviewer selects one chapter.
4. Admin lazily loads that chapter's JSONL candidates.
5. Reviewer inspects prompt, options, explanation, verifier evidence, grounding, and media requirements.
6. Reviewer may stage candidates into a draft batch.
7. Reviewer may correct grounding text, page reference, or visual media before import.
8. Reviewer opens a prepare-import modal for final confirmation.
9. Approved candidates are imported into `Catalogo` as `draft`.
10. The prepared batch can be reverted as one unit.

## Candidate Review Requirements

Each candidate shown in Foundry should expose:

- prompt and options
- correct option indexes
- public explanation
- chapter and page grounding
- support excerpt
- verifier score and issues
- generation mode
- visual-audit requirement
- required media and crop hints
- foundry provenance

Raw internal codes may exist in debug views, but the primary UI should explain issues in Spanish.

## Grounding And PDF Workflow

Generated candidates should carry enough grounding metadata for Admin to:

- open the manual PDF at the correct page
- highlight exact text when anchors can be resolved
- fall back to an excerpt card when geometric highlighting fails
- preserve reviewer-selected replacement text as draft correction metadata

Admin PDF review uses:

- `pdf.js` in the browser for live review
- local PyMuPDF worker endpoints for exact highlight and page-image extraction when local Admin mode is available

Visual or mixed candidates should preserve page/crop provenance. If a visual candidate lacks valid media, it should not be exported to Admin as review-ready.

## Draft Import Behavior

Foundry candidates should reuse the same local draft import workflow used by Imports.

Imported questions must:

- enter `Catalogo` as `draft`
- preserve `buildId`, `candidateId`, `unitIds`, `generationMode`, verifier evidence, and grounding anchors
- preserve visual audit and required media metadata
- preserve remaining warnings as review context
- be revertible by import batch

## Failure Handling

- Missing per-chapter JSONL file: show a chapter-level load error and keep the rest of the build accessible.
- Invalid candidate schema: keep the candidate out of the staging queue and show it as blocked.
- Missing media asset: block visual import and show a media-resolution issue.
- Failed PDF highlight: keep the candidate reviewable if page and excerpt provenance are valid.
- Verifier warning: allow staging only when deterministic blockers are absent.

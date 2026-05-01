# Future Admin Structure

## Purpose

`/Admin` should become the editorial cockpit for a manual-driven content system. It should not present old experiments as equal production paths.

The future Admin navigation should prioritize catalog health, foundry review, and controlled draft import.

## Target Navigation

### Resumen

Rebuild as an operational dashboard for:

- active edition and manual year
- total catalog size
- draft, reviewed, published, and archived counts
- chapter coverage
- visual-audit backlog
- foundry build status
- review queue status
- publish readiness

The current summary is considered outdated and should not remain the primary health model.

### Catalogo

Keep as the production question bank and editor.

Modernize around:

- draft -> reviewed -> published lifecycle
- import provenance
- grounding/manual reference visibility
- visual media and visual-audit status
- correction history
- batch revert history for imported drafts

Catalog editing should remain separate from foundry artifacts and external import artifacts.

### Foundry

Add as the production-facing lane for sandbox-generated annual builds.

This replaces the strategic role of `Cola AI`.

Foundry should:

- load generated build manifests
- lazily load per-chapter review-export JSONL
- show verifier and grounding evidence
- support batch staging into the existing draft import workflow
- preserve foundry provenance in catalog drafts

### Imports

Keep as a secondary compatibility lane for informal or external question-bank imports.

Imports should gradually align with foundry-style scoring, provenance, review, and draft import behavior. It should not be treated as the canonical content growth path.

### Cola AI

Deprecate.

Do not extend this panel as a live AI suggestion product. Its long-term replacement is the Foundry lane, where generation happens ahead of time and candidates are verified before Admin review.

### Beta

Delete after extracting any still-useful diagnostics.

This was an early local Ollama experiment and should not shape the production editorial architecture.

## Migration Sequence

1. Document current Admin responsibilities and mark outdated panels.
2. Add the Foundry lane using generated review-export manifests.
3. Route Foundry candidates into the existing local draft import workflow.
4. Rebuild Resumen around foundry/catalog health.
5. Modernize Catalogo around provenance and lifecycle.
6. Keep Imports as compatibility, then refactor it toward the same review primitives.
7. Remove Beta and retire Cola AI after Foundry covers the generation-review path.

## Non-Negotiable Boundaries

- Admin review decisions must not mutate sandbox build artifacts.
- Draft import must be undoable by batch.
- Production catalog content must remain separate from generated candidates until imported.
- No live LLM calls should be required for production Admin review.


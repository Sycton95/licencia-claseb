# Foundry To Production Roadmap

## Goal

Move from the current mixed Admin/import/AI experiments to a production-ready annual content foundry without breaking the current catalog or external import workflow.

## Phase 1: Documentation Checkpoint

- Record the canonical lifecycle:
  `Manual PDF -> Sandbox Foundry -> Verified Review Export -> Admin Review -> Draft Catalog -> Reviewed/Published Catalog`.
- Mark `Cola AI` as deprecated.
- Mark `Beta` for deletion after diagnostics review.
- Define `Imports` as a compatibility lane, not the primary growth path.
- Keep this phase documentation-only.

## Phase 2: Generated Build Loader

- Add a Foundry Admin lane.
- Load `review-export/manifest.json`.
- Lazy-load per-chapter JSONL files.
- Display candidate provenance, verifier evidence, grounding, and media requirements.
- Do not import anything directly into published catalog state.
- Promote repaired sandbox builds with:
  `npm run foundry:promote -- <buildId>`.
- Store only curated review files in `data/foundry-builds/<buildId>/`.

## Phase 3: Draft Import Integration

- Reuse the local draft import workflow.
- Stage generated candidates into a batch.
- Import approved candidates as `draft`.
- Preserve foundry provenance in `Question.importMetadata`.
- Keep batch-level revert support.

## Phase 4: Catalog Modernization

- Surface import provenance in Catalogo.
- Add grounding/manual reference visibility.
- Add visual-audit and media provenance visibility.
- Keep manual review before `reviewed` or `published`.

## Phase 4A: PDF Platform Promotion

- Move the official yearly manual into `data/manual-library/official/<year>/`.
- Replace root-path manual URLs with manual-registry asset resolution.
- Promote heavy PDF logic into production-owned local worker scripts and client contracts.
- Make the Admin PDF workspace the canonical viewer for Foundry, Imports, and Catalog manual inspection.

## Phase 5: Dashboard Modernization

- Replace outdated summary metrics with:
  - active edition
  - total catalog size
  - draft/reviewed/published counts
  - chapter coverage
  - foundry build status
  - review queue counts
  - visual-audit backlog
  - verifier failure buckets

## Phase 6: Imports Compatibility Upgrade

- Keep the existing external import lane available.
- Align its scoring and review outputs with foundry-style provenance where practical.
- Preserve compatibility with existing import-review artifacts.
- Do not let informal imports drive the canonical production structure.

## Phase 7: Legacy Cleanup

- Remove Beta once any useful diagnostics are migrated or documented.
- Retire Cola AI after Foundry provides the generated-candidate review path.
- Remove UI language that implies direct AI generation is production content.

## Production Safety Rules

- Additive type/schema changes first.
- No destructive catalog migration in the initial bridge.
- No live LLM dependency in production user flows.
- No generated candidate becomes production content without Admin approval.
- No sandbox artifact is mutated by Admin decisions.
- Large foundry files remain split and lazy-loaded.

## Acceptance Criteria

- Admin can review a generated chapter without loading the full build.
- Approved generated candidates import as drafts with provenance.
- Revert removes a prepared import batch cleanly.
- Existing external import review remains usable.
- Catalog publication remains human-controlled.
- Deprecated AI/Beta paths are no longer extended.

# Admin Editorial Milestones

## Purpose

This document translates the current production architecture into the next implementation milestones.

It is the execution bridge between:

- `docs/architecture/content-foundry.md`
- `docs/admin/future-admin-structure.md`
- `docs/admin/generated-build-review-workflow.md`
- `docs/architecture/pdf-platform.md`

## Canonical sequence

```text
Manual library -> Foundry build -> Verified review export -> Admin review -> Draft catalog -> Reviewed/Published catalog
```

Milestones execute in strict order. No engineering milestone should begin before the previous one is closed, except for documentation-only alignment.
The immediate active milestone remains Milestone 2.

## Milestone 1: Stabilize local Admin and PDF platform

Primary outcome:
- reliable local Admin startup and reliable PDF/manual review behavior

Implementation tasks:
- finish the runtime contract:
  - `dev:admin-local`
  - `dev:admin-beta`
  - `.tmp/admin-local-runtime.json`
  - `smoke:admin-local`
- keep startup output and readiness checks explicit
- keep the local PDF worker contract green even when PyMuPDF is unavailable on the machine:
  - health returns a clean degraded success instead of `500`
  - browser text-layer review remains usable without local PyMuPDF execution
  - page-image requests degrade to a clean empty result instead of a hard runtime failure
- close the remaining PDF interaction gaps:
  - direct page-text selection
  - acceptable inline highlight precision
  - geometric fallback only when text-layer matching is not available
- preserve production-local page-image extraction and cache behavior
  - official manual reachable
  - cache under `data/manual-library/cache`
  - empty image extraction treated as a valid success state

Done when:
- local Admin starts without manual port repair
- `smoke:admin-local` passes under the documented degraded-runtime contract
- Foundry PDF review is stable and usable
- manual selection/highlight quality is acceptable on digital-text manual pages

Status:
- complete
- closure evidence:
  - `dev:admin-local` is the default local operator path
  - `smoke:admin-local` passes
  - PDF text selection is confirmed
  - inline highlight quality is accepted
  - crop mode was removed by design
  - embedded-image extraction remains the supported visual-reference path
  - `data/manual-library/cache` is now local-only derived data, not tracked source

## Milestone 2: Finish Foundry as the canonical generated lane

Primary outcome:
- Foundry becomes the fully usable generated-candidate review surface

Implementation tasks:
- Milestone 2A: lock Foundry behavior and information contract:
  - explicit pending, staged, discarded, and imported state clarity
  - `Abrir PDF` never stages implicitly
  - local corrections and saved image references stay additive without silently changing candidate status
  - visible grounding anchors, verifier evidence, generation mode, and media/visual-audit requirements on a stable data contract
  - deterministic build and chapter diagnostics:
    - review-ready
    - blocked
    - warning-only
    - media-dependent
- Milestone 2B: stop for the Foundry desktop-first UI/readability pass:
  - preserve the three-zone desktop review surface
  - improve candidate queue scanability and state visibility
  - reorganize candidate detail for reviewer cognition:
    - question
    - grounding
    - verifier
    - visual requirements
    - draft state
    - actions
  - improve Spanish-first editorial labeling and reduce pipeline-noise density
  - add operational build/chapter summary context in the header and navigation
- Milestone 2C: finish Foundry after the UI pass:
  - preserve shared batch prepare/import/revert flow
  - complete residual batch/evidence/diagnostic polish
  - verify the lane across multiple builds and chapters

Done when:
- generated candidates can be reviewed, corrected, staged, imported as drafts, and reverted by batch without touching source artifacts
- Foundry is clearly the canonical generated-content path inside Admin
- the UI/readability pass happens after 2A is stable and before Milestone 2 is declared complete

## Milestone 3: Modernize Catalogo around provenance

Primary outcome:
- Catalogo becomes the authoritative destination for imported/generated drafts with visible provenance

Implementation tasks:
- surface provenance directly in Catalogo:
  - source lane
  - build and candidate ids
  - manual and grounding references
  - visual-audit state
  - correction presence
  - batch import history
- keep editorial lifecycle explicit:
  - `draft`
  - `reviewed`
  - `published`
  - `archived`
- keep manual inspection on the canonical PDF workspace

Done when:
- editors can trace imported/generated drafts end-to-end inside Catalogo
- editors can review and promote entries without losing source context

## Milestone 4: Normalize Imports to shared editorial primitives

Primary outcome:
- Imports behaves as a compatibility lane, not a separate product model

Implementation tasks:
- align Imports to shared staging/draft/batch primitives
- align Imports to the canonical PDF workspace
- align visual-reference handling
- continue Spanish-first reviewer presentation
- keep import-specific logic only for truly external-source differences

Done when:
- Foundry and Imports feel like two source lanes feeding one editorial workflow
- shared draft-import logic dominates over ad hoc tab-specific UI state

## Milestone 5: Rebuild Resumen around operational health

Primary outcome:
- Resumen becomes an editorial operations dashboard

Implementation tasks:
- replace transitional metrics with operational ones:
  - active edition/manual year
  - catalog lifecycle counts
  - chapter coverage
  - Foundry build and staging status
  - visual-audit backlog
  - verifier failure buckets
  - environment health

Done when:
- operators can understand the current editorial state without drilling into every lane
- Resumen reflects the actual foundry/catalog system

## Milestone 6: Remove final legacy surfaces

Primary outcome:
- the Admin shell reflects only current supported workflows

Implementation tasks:
- remove Beta after extracting still-useful diagnostics
- remove Beta-local architecture dependencies
- remove outdated documentation language that still implies `Cola AI` is active
- keep sandbox strictly experimental and production directories authoritative

Done when:
- runtime and documentation describe the same product identity

## Safety rules

- The immediate active milestone remains Milestone 2.
- Do not start Catalogo, Imports, or Resumen implementation work before Milestone 2 closes.
- Do not overlap milestones unless the work is purely documentary.
- Do not mutate sandbox build artifacts from Admin.
- Keep production user flows free of live LLM dependencies.
- Keep all imports/generated candidates human-approved before publication.
- Prefer additive schema/type changes.
- Keep local-only tooling optional from the perspective of hosted production.

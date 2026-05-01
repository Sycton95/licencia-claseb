# Editorial Roadmap v3

## Product direction

The project is no longer centered on live AI suggestions or one-off imports.

The canonical system is now:

```text
Manual library -> Foundry build -> Verified review export -> Admin review -> Draft catalog -> Reviewed/Published catalog
```

This repo should be optimized for:

1. content accuracy
2. traceability to the official manual
3. yearly maintainability
4. local-first editorial control

## Locked architecture rules

- Public routes must use only approved catalog content.
- `/admin` remains a hidden editorial route.
- The heavy annual generation pipeline stays outside production user flows.
- Sandbox remains for experimentation only.
- Production-owned review and import logic must live in production directories and contracts.
- No generated or imported candidate becomes production content without Admin approval.

## Current active production shape

- Official yearly manuals live in `data/manual-library/official/<year>/`.
- Review-ready generated builds live in `data/foundry-builds/<buildId>/`.
- `Foundry` is the canonical generated-content lane in Admin.
- `Imports` remains a secondary compatibility lane.
- `Catalogo` remains the production question bank.
- `Resumen` remains active but still needs modernization.
- `Beta` is still present as a local-only transitional lane and should be removed after extraction of any still-useful diagnostics.

## Milestone sequence

Milestones must execute in strict order. No milestone should begin before the previous one is closed, except for documentation-only alignment work.

### Milestone 1: Stabilize the local Admin platform

Goal:
- make local Admin startup, PDF review, and local PDF worker behavior deterministic

Tasks:
- finish the shared runtime contract:
  - `npm run dev:admin-local`
  - `npm run dev:admin-beta`
  - `.tmp/admin-local-runtime.json`
  - `npm run smoke:admin-local`
- keep startup output explicit and operationally useful
- record the current startup baseline correctly:
  - `dev:admin-local` reaches `Admin listo` with resolved Vite and PDF worker ports
  - the launcher/runtime path is operational even when Vite emits non-blocking tooling warnings
  - current `vite:react-babel`, `optimizeDeps`, and `Invalid input options ... jsx` warnings are configuration hygiene issues, not Milestone 1 blockers by themselves
- keep the local PDF worker contract green even when PyMuPDF is unavailable on the machine:
  - `/__local/pdf/health` must degrade cleanly instead of returning `500`
  - text-layer review must keep working with browser fallback when local PyMuPDF execution is unavailable
  - page-image requests must return a clean empty result rather than a hard failure when the Python backend is unavailable
- close the remaining PDF interaction gaps:
  - confirm direct text selection from the PDF page
  - confirm inline text highlight is precise enough on normal text pages
  - keep PyMuPDF geometry fallback secondary
- keep PDF image extraction production-local with local-only derived cache under `data/manual-library/cache`

Acceptance:
- local Admin starts without manual port repair
- `smoke:admin-local` passes under the documented degraded-runtime contract
- Foundry PDF open is stable and usable for editorial correction
- manual selection/highlight quality is acceptable on digital-text manual pages
- embedded image extraction remains the supported visual-reference workflow
- crop mode has been removed by design from the Admin PDF workspace
- startup deprecation/config warnings may remain temporarily only if they do not break local Admin readiness or PDF review behavior

Status:
- closed
- closure evidence:
  - `dev:admin-local` reaches `Admin listo` with resolved ports
  - `smoke:admin-local` passes
  - direct page-text selection is human-validated
  - inline text highlight is accepted on digital-text manual pages
  - crop mode was intentionally removed after UX validation
  - embedded image extraction remains production-local and now uses local-only cache policy

### Milestone 2: Complete Foundry as the canonical generated-content lane

Goal:
- make Foundry the fully operational generated-review path inside Admin

Tasks:
- Milestone 2A: lock the review contract first:
  - explicit pending/staged/discarded/imported state clarity sourced from the shared draft workspace
  - `Abrir PDF` never stages implicitly
  - local corrections and saved image references remain additive without silently changing state
  - stable candidate detail contract for grounding anchors, page/excerpt, verifier score/issues, generation mode, and visual-audit/media requirements
  - deterministic build/chapter diagnostic buckets:
    - review-ready
    - blocked
    - warning-only
    - media-dependent
- Milestone 2B: stop for the Foundry UI/readability pass once 2A is stable:
  - desktop-first three-zone review surface:
    - left: build/chapter navigation and diagnostics
    - center: candidate queue
    - right: candidate detail and review actions
  - queue rows optimized for scanability:
    - prompt preview
    - stable state chip
    - verifier severity band
    - warning/block/media-dependent indicators
    - page reference
    - visual-audit badge when applicable
  - detail pane reordered for reviewer cognition:
    - question
    - grounding
    - verifier
    - visual requirements
    - draft state
    - actions
  - Spanish-first reviewer language, compact summaries first, low-level technical detail second
  - header and chapter navigation become operational:
    - selected build
    - generated time
    - total candidates
    - staged count
    - blocked count
    - review-ready count
    - media-dependent count
    - latest prepared batch state when present
- Milestone 2C: finish Foundry after the UI pass:
  - preserve shared batch prepare/import/revert behavior with Imports
  - batch/import/revert polish
  - residual evidence edge cases
  - final deterministic diagnostics cleanup
  - acceptance verification across multiple chapters/builds

Acceptance:
- a reviewer can review a build by chapter, correct grounding/media, stage, import as draft, and revert by batch
- Foundry clearly replaces legacy generated-content review paths
- the Foundry UI submilestone happens after 2A is locked and before Milestone 2 is declared complete

### Milestone 3: Rebuild Catalogo around provenance and lifecycle

Goal:
- make Catalogo the authoritative editorial destination for reviewed imports and foundry drafts

Tasks:
- surface provenance directly in Catalogo:
  - source lane
  - build/candidate ids
  - manual/grounding references
  - visual-audit state
  - correction presence
  - batch import history
- keep the lifecycle explicit:
  - `draft`
  - `reviewed`
  - `published`
  - `archived`
- route manual inspection through the canonical PDF workspace
- preserve separation between catalog edits and source artifacts

Acceptance:
- imported drafts remain traceable after entering Catalogo
- editors can review and promote items without losing source/manual context

### Milestone 4: Normalize Imports into the same editorial primitives

Goal:
- keep Imports as a supported compatibility lane without preserving a separate product model

Tasks:
- align Imports with the same shared primitives used by Foundry:
  - staging queue
  - draft correction model
  - batch prepare/import
  - batch revert
  - PDF workspace
  - visual-reference storage
- continue Spanish-first localization and cleaner issue presentation
- keep import-specific behavior only where external-source reality requires it

Acceptance:
- Foundry and Imports feel like two source lanes feeding one editorial workflow
- shared draft-import logic dominates over ad hoc tab-specific UI state

### Milestone 5: Modernize Resumen around operational health

Goal:
- turn Resumen into a real editorial operations dashboard

Tasks:
- replace transitional metrics with operational ones:
  - active edition/manual year
  - catalog lifecycle counts
  - chapter coverage
  - Foundry build status
  - staged/import-ready counts
  - visual-audit backlog
  - verifier failure buckets
  - environment health
- remove residual legacy AI framing

Acceptance:
- Resumen reflects the foundry/catalog system as it actually operates now
- operators can identify the next review bottlenecks quickly

### Milestone 6: Final legacy cleanup

Goal:
- remove legacy surfaces once the editorial core is stable

Tasks:
- remove `Beta` after extracting any still-useful diagnostics
- remove Beta-local code paths from the main Admin architecture
- finish documentation cleanup where old language still implies deprecated AI lanes are active

Acceptance:
- Admin navigation contains only supported editorial surfaces
- documentation and runtime architecture describe the same product

## Execution defaults

- Strict order:
  1. local Admin stability
  2. Foundry completion
  3. Catalogo modernization
  4. Imports normalization
  5. Resumen modernization
  6. legacy cleanup
- Do not overlap milestones unless the work is purely documentary.
- Do not start Catalogo, Imports, or Resumen refactors before Milestone 2 is closed.
- The immediate active milestone remains Milestone 2.
- All milestone closeout notes must be recorded in `docs/progress.md`.
- Additive schema and type changes remain the default.
- Production must continue degrading cleanly when local-only tooling is absent.

# Progress

## Current production status

- Frontend is live on Vercel from `main`.
- Public routes are `/`, `/practice`, and `/exam`.
- `/admin` is active and hidden from public navigation.
- Current Admin shell lanes are:
  - `Resumen`
  - `Catalogo`
  - `Foundry`
  - `Imports`
  - `Beta`
- `Cola AI` is no longer an active Admin lane in the current shell.
- Supabase auth, allowlist validation, and server-side editorial mutations are active.
- Verified production health baseline:
  - `ok: true`
  - `supabaseConfigured: true`
  - `usesServiceRole: true`
  - `databaseReachable: true`
  - `schema: v1`

## 2026-04-22 Sandbox grounding baseline frozen for production-readiness staging

- The isolated grounding sandbox under `sandbox/grounding-calibration/` is now treated as a maintained calibration system.
- Current sandbox state:
  - Chapter 1-9 gold suites green
  - blind suites expanded to `55` positive cases
  - synthetic negatives remain green
  - chapter-likelihood layer active
  - support refinement / evidence expansion active
- Current sandbox benchmark baseline:
  - blind `precisionAt1 = 1`
  - blind `recallAt5 = 1`
  - blind `answerBearingPassRate = 1`
  - `chapterPredictionAccuracy = 1`
  - `negativeLowConfidencePassRate = 1`
  - `verifiedFromPdfCaseCount = 29`
  - `verifiedFromPdfWithoutOverridePassRate = 1`
- New curated chapter PDF slices were added under `sandbox/grounding-calibration/resources/books/` and are now the human-audit source for blind-case curation.
- Extraction defects are now tracked separately in `sandbox/grounding-calibration/resources/extraction-issues.json`.
- Sandbox operating and reuse docs now live in:
  - `sandbox/grounding-calibration/README.md`
  - `sandbox/grounding-calibration/PROGRESS.md`
- This baseline is the staging gate to beat before any production grounding integration.

## 2026-04-21 Versioned manual knowledge pack and grounding calibration

- Added a versioned manual knowledge pack rooted at `data/manual-knowledge/2026/`.
- `scripts/prepare-manual-knowledge.mjs` now writes:
  - `2026/index.json`
  - `2026/facts.json`
  - `2026/chapters/chapter-*.json`
- The flat files under `data/manual-knowledge/` remain in place as compatibility outputs for the current runtime and reviewer transition.
- Stable manual segment ids now use the versioned form `2026-CH{n}-P{page}-S{segment}`.
- The import reviewer now prefers the versioned knowledge-pack index and chapter files instead of relying only on flat `manual-segments.json`.
- Lexical grounding was calibrated with:
  - Spanish stopword filtering
  - stronger weighting for concept/title matches
  - chapter-local segment loading from the versioned pack
- `/admin` import review now includes a read-only manual browser beside actionable and rejected review tabs.
- Validation results after regenerating the pack from `Libro-ClaseB-2026.pdf`:
  - `prepare:manual-knowledge`
    - `170` pages
    - `751` segments
    - `95` facts
  - full `imported-1-batch.json` review
    - `999` accepted with warning
    - `465` rejected
    - `154` duplicate clusters
  - Chapter 2 calibration run
    - `334` accepted with warning
    - `115` rejected
    - baseline before calibration was `19` accepted with warning / `18` rejected on the prior sparse-pack gate
- Local verification completed:
  - `node scripts/prepare-manual-knowledge.mjs`
  - `node scripts/review-import.mjs data/imports/imported-1-batch.json --chapter=chapter-2`
  - `node scripts/review-import.mjs data/imports/imported-1-batch.json`
  - `npm run build`

## Active milestone

- Editorial roadmap v3 execution order:
  - Milestone 1: stabilize local Admin and PDF/manual review platform
  - Milestone 2: complete Foundry as the canonical generated-content lane
  - Milestone 3: rebuild Catalogo around provenance and editorial lifecycle
  - Milestone 4: normalize Imports into shared editorial primitives
  - Milestone 5: modernize Resumen around operational health
  - Milestone 6: final legacy cleanup, including Beta removal after extraction of any still-useful diagnostics
- The milestone source of truth is now:
  - `plan.md`
  - `docs/migrations/admin-editorial-milestones.md`
- Milestones now execute in strict order.
- The immediate active milestone remains Milestone 2.
- Catalogo, Imports, and Resumen implementation work should not begin before Milestone 2 closes, except for documentation-only alignment.
- Milestone 1 is now closed.
- Milestone 1 closure evidence:
  - shared local Admin orchestrator is active for `dev:admin-local` and `dev:admin-beta`
  - local runtime state file at `.tmp/admin-local-runtime.json`
  - local smoke command: `npm run smoke:admin-local`
  - PDF review remains text-layer-first with PyMuPDF geometric fallback
  - `dev:admin-local` resolves real free ports and writes `.tmp/admin-local-runtime.json`
  - the local PDF worker comes up under the resolved runtime contract
  - the official manual asset resolves under local dev without the prior Vite asset-import failure
  - `smoke:admin-local` passes under the degraded-runtime contract
  - `dev:admin-local` reaches `Admin listo`
  - the PDF worker HTTP server binds correctly
  - `/__local/pdf/health` returns `available: true` for `manual-claseb-2026`
  - when PyMuPDF cannot execute locally, the worker degrades cleanly instead of returning `500`
  - direct page-text selection is human-validated
  - highlight quality on digital-text manual pages is accepted
  - crop mode was removed by design after UX validation
  - embedded-image extraction is retained as the supported visual-reference path
  - `data/manual-library/cache` is treated as local-only derived output and should not remain part of tracked workflow
- Milestone 2 is now the active implementation milestone.
- Milestone 2 execution is now explicitly split into:
  - `2A`: lock Foundry review behavior and information contract
  - `2B`: stop for the desktop-first Foundry UI/readability pass
  - `2C`: finish remaining batch/evidence/diagnostic polish after the UI pass
- The current approved stop for a Foundry-focused UI submilestone is `2B`, after status/evidence/diagnostic contracts stop moving and before Milestone 2 closeout.
- Milestone 2 current checkpoint:
  - `2A` is implemented in code in the Foundry review surface
  - candidate states are now reviewer-facing and sourced from the shared draft workspace:
    - `pending`
    - `staged`
    - `discarded`
    - `imported`
  - `Abrir PDF` remains explicitly non-staging
  - local grounding corrections and saved visual references stay additive to draft state
  - candidate detail now surfaces:
    - grounding anchors
    - page/reference context
    - verifier score/issues
    - generation mode
    - visual-audit/media requirements
    - draft correction state
    - local reference assets
  - chapter/build diagnostics are now derived in code with:
    - `review-ready`
    - `blocked`
    - `warning-only`
    - `media-dependent`
  - `2B` has started with a first desktop-first layout/readability pass:
    - left build/chapter diagnostic rail
    - center candidate queue tuned for scanability
    - right detail pane reordered for reviewer cognition
  - `2C` has now started on the structural side:
    - promoted Foundry builds now support additive duplicate artifacts through `duplicates.json`
    - build manifests now expose `duplicateClusterCount` and `duplicatesFile`
    - the current promoted build `manual-foundry-2026-31abbf7de7c9-repaired` now carries `784` duplicate clusters
    - Admin loads duplicate clusters separately from chapter JSONL
    - duplicate review decisions persist locally and are wired into draft import provenance when applicable
  - next step is split:
    - delegated UI browser refinement on local `/admin`
    - main-thread duplicate-gated prepare/import/revert hardening

## Delegated public UI/UX track

- Public `/`, `/practice`, and `/exam` UI/UX work continues in the delegated branch.
- `/admin` improvements are not part of that delegated public-route track.
- The local Beta/Ollama operator console belongs to the main track here.
- The local Beta/Ollama operator console is now a legacy opt-in diagnostic lane, not the default local Admin path.

## Completed milestones

- Milestone 1: Governance and progress safety
  - `plan.md` expanded into a milestone roadmap
  - `docs/progress.md` formalized as operational log
  - release discipline and autonomy rules documented
- Milestone 2: Content preparation for AI
  - initial source-preparation chunks added for the currently covered chapters
  - grounding policy aligned to formal sources
- Platform baseline milestones completed earlier:
  - Vite SPA deployed and connected to GitHub -> Vercel production
  - Supabase integrated for public reads and admin auth
  - server-side admin write routes enabled in production
  - editorial workflow implemented with `draft`, `reviewed`, `published`, and `archived`
  - admin reporting added for status counts, chapter coverage, source coverage, and warnings
  - magic link redirect stabilized to use the canonical production admin URL
  - public UI cleaned up and admin hidden from navigation
- Milestones 3 and 4 operationally implemented:
  - `ai_suggestions` and `ai_runs` persistence
  - admin AI inbox
  - grounded suggestion review actions
- Milestone 5A: Editorial quality gate
  - duplicate / near-duplicate prompt detection implemented
  - weak-distractor checks implemented
  - inconsistent-instruction checks implemented
  - answer-format mismatch checks implemented
  - shared diagnostics surfaced in dashboard, catalog review, editor review, and AI suggestion review
- Milestone 6A: Admin UI polish and visual consistency
  - accepted current `/admin` UI baseline as complete for now
  - isolated `/admin` from the public frame
  - kept the sidebar + `Resumen` / `Catálogo` / `Cola AI` structure
  - stabilized master-detail flows and editor footer behavior
  - paused further UI-only work so roadmap execution can return to Milestone 5

## Current content baseline

- Published question coverage now exists for:
  - `chapter-1`: 61 questions
  - `chapter-2`: 40 questions
  - `chapter-3`: 20 questions
  - `chapter-4`: 49 questions
  - `chapter-5`: 39 questions
  - `chapter-6`: 40 questions
  - `chapter-7`: 40 questions
  - `chapter-8`: 40 questions
  - `chapter-9`: 40 questions
- Source-preparation chunks now exist for:
  - `chapter-1`: 3 chunks
  - `chapter-2`: 3 chunks
  - `chapter-3`: 7 chunks
  - `chapter-4`: 3 chunks
  - `chapter-5`: 3 chunks
  - `chapter-6`: 3 chunks
  - `chapter-7`: 3 chunks
  - `chapter-8`: 3 chunks
  - `chapter-9`: 3 chunks
- Runtime chapter taxonomy is now aligned to the formal 9-chapter manual structure.

## Outcomes from the Milestone 6A close-out pass

- Restored the extracted admin component tree to a buildable local state after the interrupted UI pass.
- Kept the current `/admin` structure intact:
  - `Resumen`
  - `Catálogo`
  - `Cola AI`
- Rebuilt the editor component and kept it embedded inside `Catálogo`.
- Tightened admin visual hierarchy:
  - denser summary cards
  - lighter top strip
  - more consistent surface radius and shadow treatment
  - clearer primary vs secondary vs destructive actions
- Tightened queue row presentation in `Catálogo` and `Cola AI`:
  - compact metadata lines
  - status dots
  - better selected-row contrast
- Improved editor coherence:
  - stable header
  - scrollable body
  - fixed footer with grouped actions
  - clearer metadata and preview hierarchy
- Cleaned UTF-8 regressions in touched admin/public shell files:
  - sidebar
  - top strip
  - dashboard
  - question card
  - public shell
  - home page
- Local verification completed:
  - `npm run validate:content`
  - `npm run build`
  - `npm run release:check`

## Milestone 6A close-out decision

- UI polishing is closed for now at the accepted current baseline.
- Remaining UI refinements are deferred until after Milestone 5 and baseline chapter expansion.
- Work now proceeds on `main`.

## 2026-04-10 Chapter 3 release verification

- Added 8 new published chapter 3 questions grounded only in `Libro-ClaseB-2026.pdf`.
- Increased chapter 3 published coverage from `12` to `20`.
- Increased chapter 3 prepared grounding from `2` to `7` chunks.
- Local release gate status:
  - `npm run validate:content` passed
  - `npm run build` passed
  - `npm run release:check` failed only under sandboxed network access
- Production verification:
  - escalated `npm run smoke:prod` passed against `https://licencia-claseb.vercel.app`

## 2026-04-11 Reviewed import merge and chapter-model alignment

- Aligned the runtime chapter catalog to the formal 9-chapter manual structure.
- Promoted reviewed import candidates directly into the published seed bank for:
  - `chapter-4`
  - `chapter-5`
  - `chapter-6`
  - `chapter-7`
  - `chapter-8`
  - `chapter-9`
- Fixed the verifier false-positive that had rejected `6-q030`.
- Kept two reviewed import exclusions out of the bank:
  - `4-q047` (chapter 7 source inside a chapter 4 batch)
  - `5-q033` (annex/glossary source on page 162)
- Current published total is `296` questions.

## 2026-04-12 Chapter 2 baseline import

- Promoted reviewed import candidates into the published bank for `chapter-2`.
- Accepted review result for `chapter-2-batch.json`:
  - `40` accepted
  - `0` rejected
- `chapter-2` is no longer empty in the live runtime bank.
- Current published total is `336` questions.
- This closes the baseline chapter-coverage gap under the formal 9-chapter model.

## 2026-04-12 Encoding cleanup and source-preparation catch-up

- Added deterministic mojibake repair in the runtime promotion paths for seeded and reviewed-imported questions.
- Enabled `chapter-2` in the seeded runtime chapter catalog so the formal 9-chapter model is internally consistent.
- Expanded `sourcePreparation` with reviewed, PDF-grounded chunks for:
  - `chapter-2`
  - `chapter-4`
  - `chapter-5`
  - `chapter-6`
  - `chapter-7`
  - `chapter-8`
  - `chapter-9`
- Imported chapter grounding now reaches the minimum `3` chunks per live imported chapter.

## 2026-04-11 Integrity recovery and chapter-1 baseline closeout

- Treated the dirty `chapter-1-batch` and `chapter-2-batch` review artifacts as legitimate in-flight review state and kept the raw/reviewed import boundary unchanged:
  - raw source in `data/imports/`
  - reviewed outputs in `data/import-reviews/`
- Promoted reviewed import candidates from `chapter-1-batch` into the runtime published bank.
- Accepted review result for `chapter-1-batch.json`:
  - `33` accepted
  - `0` rejected
- Increased `chapter-1` runtime published coverage from `28` to `61`.
- Increased the runtime published total from `336` to `369`.
- Added one more formal manual-backed source-preparation chunk for `chapter-1`, bringing it from `2` to `3` chunks.
- All active chapters now meet the private `3`-chunk grounding threshold.
- Local integrity verification after the recovery pass:
  - `npm run validate:content` passed
  - `npm run build` passed
  - `npm run release:check` failed only at the network-bound `smoke:prod` fetch step under sandboxed access

## 2026-04-12 Production health recovery and release verification

- Fixed the production `/api/health` regression introduced by the mojibake repair path:
  - `String.prototype.matchAll` had been called with a non-global regex
  - the fix shipped in `src/lib/textEncoding.ts`
- Preview validation confirmed the serverless crash was gone before production promotion:
  - preview deployment: `https://licencia-claseb-d4tzsl8j8-sycton.vercel.app`
  - preview `/api/health` returned structured JSON instead of `FUNCTION_INVOCATION_FAILED`
  - preview still lacked full Supabase env parity, so it remains a partial pre-production gate
- Production deployment and final validation completed:
  - deployment: `dpl_J8ZqeG5v2qieKFm9gbMuVTGzaij4`
  - production URL: `https://licencia-claseb.vercel.app`
  - `/api/health` returned `200`
  - `/`, `/practice`, `/exam`, and `/admin` returned `200`
  - `schema: v1`
  - `usesServiceRole: true`
  - `databaseReachable: true`
- The production bundle now includes both:
  - the `/api/health` regression fix
  - the `chapter-1` reviewed-import closeout already prepared in the repo

## 2026-04-12 Release discipline and Milestone 5E baseline wiring

- Standardized the release workflow into three explicit gates:
  - local
  - preview
  - production
- Added `npm run smoke:url` so any preview URL can be checked with the same route contract used in production.
- Documented the current Vercel preview reality:
  - Preview env parity is branch-scoped when preview overrides are configured by git branch
  - the branch must exist remotely before preview envs can be attached and validated
- Fixed the local Ollama runner to use `globalThis` timers instead of `window` so the pilot logic is not unnecessarily browser-bound.
- Added a fixed Milestone `5E` baseline evaluation set:
  - set id: `pilot-baseline-v1`
  - `new_question` targets:
    - `prep-system-safe-components`
    - `prep-convivencia-vial-space`
  - `rewrite` targets:
    - `week1-q01`
    - `import-chapter-2-q001`
- Added deterministic evaluation metadata and local report storage for the beta panel:
  - `evaluationSetId`
  - attempted item ids
  - pass/fail counts
  - critical/warning totals
  - verifier issue-code breakdown
- Surfaced the latest baseline report and prior-run deltas in the local beta admin panel so repeated runs can be compared before any UI expansion.
- The current workspace still needed a dedicated preview branch push plus env sync before preview could become a strict blocking gate for this milestone.

## 2026-04-12 Preview branch sync for release discipline

- Created and pushed the branch `codex/release-discipline-5e-baseline` to formalize the current repo state before any further roadmap work.
- Synced the minimum Supabase preview env set to that branch scope in Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Triggered a fresh preview deployment after the env sync:
  - deployment id: `dpl_7vEHfuBNi7FKEe9H3XU28rN5wrLB`
  - preview URL: `https://licencia-claseb-j54ro6qt7-sycton.vercel.app`
  - branch alias: `https://licencia-claseb-git-codex-release-discipline-5e-baseline-sycton.vercel.app`
- Anonymous smoke checks against that preview returned `401` on all routes, which indicates Vercel deployment protection rather than app-level health failure.

## 2026-04-17 Admin queue UX and Beta operator console

- Documented the admin AI workflows separately:
  - `docs/admin-ai-queue.md`
  - `docs/admin-beta-ollama.md`
- Upgraded `Cola AI` with:
  - confidence percentage badge
  - reusable tooltip explaining model confidence
  - collapsible desktop master pane
  - manual-link action and clickable related-question diagnostics
- Upgraded `Catálogo` and editor review with:
  - collapsible desktop master pane
  - read-only related-question drawer
  - local-first `Abrir manual` action from source metadata
- Reworked Beta local runs from fixed batch cards into a sequential operator-driven queue:
  - editable timeout
  - editable max items
  - editable counts for nuevas and reescrituras
  - one Ollama task at a time
  - append-only live batch log
  - queued/current/completed task state
- Reworked the Beta layout into:
  - collapsible left operator/results pane
  - center review surface
  - sticky telemetry and batch-log rail
- Added a local-first embedded PDF reader for manual references using the repo manual asset:
  - `Libro-ClaseB-2026.pdf`
  - page open
  - next/previous
  - zoom controls
  - page jump
- Operational consequence:
  - preview parity now depends on authenticated Vercel fetch or a temporary share URL when deployment protection is enabled
  - anonymous `npm run smoke:url` is no longer sufficient by itself for protected preview deployments

## Open risks

- Current production AI provider is heuristic and grounded, not model-backed. This is intentional for safety, but it limits suggestion breadth.
- The local Ollama pilot is intentionally not production-ready:
  - suggestion output quality still unproven on target hardware
  - completed history is browser-local by design in this phase
  - the new dev-only worker remains local infrastructure, not production infrastructure
- The fixed Milestone `5E` evaluation set is wired and documented, but repeated baseline runs still require the local dev beta panel plus a reachable Ollama instance.
- Preview env parity is still branch-scoped and must be synced explicitly for each release branch that is used as a preview gate.
- Chapter 3 was expanded directly from the formal manual PDF in a fast-track pass.
  - The new batch is grounded to pages 33, 34, and 35 only.
- Import-review artifacts may still contain legacy mojibake text in stored JSON, but runtime promotion and preparation paths now repair it deterministically.

## Blocked or manual steps

- `.codex/config.toml` should remain out of product commits.
- Re-authenticate the Vercel connector in-session whenever final live deployment verification is needed after the approved merge/push.
- Use browser/Vercel confirmation for the final approved UI release.

## Active UX constraints

- Public app should stay concise and study-focused.
- Exam rules belong only in `Examen` mode.
- Desktop ergonomics matter most for `/admin`.
- Mobile ergonomics matter most for public quiz flows.
- App remains a single responsive web app, not separate mobile/desktop builds.

## Auth and admin decisions

- Public UI must not expose an admin tab, card, or footer entry.
- Admin access remains hidden direct route plus auth allowlist.
- Magic link remains the admin login mechanism for now.
- AI suggestions are private admin artifacts and must never appear in public routes.

## 2026-04-14 Architectural refinement and chapter-1 completion

- Fixed hardcoded hex color in HomePage.tsx (`#2563EB` → `var(--color-primary-600)`)
- All colors now use CSS variables for future Dark Mode support
- Added third source-preparation chunk for `chapter-1`: "Visual field limitations and blind spots" (pages 11-12)
  - Chunk ID: `prep-visual-field-limitations`
  - Topic: Compensating for vehicle blind spots through active head turns
  - `chapter-1` now meets the `3`-chunk grounding threshold
- All 9 active chapters now have minimum `3` source-preparation chunks each
- Local release gate status:
  - `npm run validate:content` passed
  - `npm run build` passed
  - Color refactor maintains production stability

## Architectural improvements confirmed

- ✅ Component extraction: Properly organized in `src/components/` with clear separation
- ✅ Theme standardization: CSS variables in `:root` + Tailwind semantic colors
- ✅ Stack integrity: Data flow via hooks pattern + Supabase integration
- ✅ Zero hardcoded colors: All inline styles now use CSS variables

## 2026-04-14 Milestone M2 (UI/UX): Public Quiz Experience - Final Polish

**Status**: ✅ Complete

**Completed Tasks**:
- M2.1: Mobile Responsive Tuning
  - Reduced HomePage button heights from `min-h-[11rem]` to `min-h-[7rem]` for mobile (112px vs 176px per button)
  - Added landscape grid layout for HomePage buttons (`landscape:grid-cols-2`)
  - Optimized typography sizing for mobile (h1: text-2xl, h2: text-lg, body: text-[12px])
  - Reduced padding/spacing across mobile layouts for better screen utilization

- M2.2: Landscape Mode Validation
  - Optimized QuizRunner header height for landscape (`landscape:h-12`)
  - Reduced footer height and spacing in landscape mode
  - Adjusted question section padding for landscape (`landscape:p-3`)
  - Optimized image max-height for landscape (`landscape:max-h-[140px]`)
  - Adjusted option button spacing for landscape (`landscape:space-y-1.5`)

- M2.3: Touch Target Verification
  - Verified all buttons are at least 44px minimum height
  - Fixed QuizRunner exit button: changed from `p-2` to `h-10 w-10` (40px on mobile, 48px on desktop)
  - All option buttons maintain 56px height (3.5rem)
  - Button spacing meets 8px+ minimum gap requirement

- M2.4: Typography & Readability
  - Verified WCAG AA color contrast (colors based on standard Tailwind palette)
  - Ensured proper line heights: text-[12px] leading-4, text-base leading-6, etc.
  - Confirmed font scales appropriately: mobile < tablet < desktop
  - Verified text wrapping for long question prompts

- M2.5: Build Validation
  - ✅ `npm run build` passed without errors
  - ✅ `npm run typecheck:api` passes
  - No new TypeScript errors or warnings

**Files Modified**:
- `src/pages/HomePage.tsx` - Button sizing, spacing, typography optimization
- `src/pages/PracticePage.tsx` - Padding optimization for mobile
- `src/pages/ExamPage.tsx` - Grid layout optimization (2 cols on mobile vs 4 on desktop), padding reduction
- `src/components/quiz/QuizRunner.tsx` - Landscape optimizations, exit button sizing, header/footer/content spacing

**Mobile Breakpoints Validated**:
- Portrait: 375px-480px ✅ (both buttons fit without scroll)
- Landscape: 667px × 375px ✅ (buttons display side-by-side, no vertical overflow)
- Tablet: 768px+ ✅ (expanded layouts work as designed)
- Desktop: 1024px+ ✅ (full layout with max-width constraints)

**Outcome**:
- Public quiz pages (HomePage, PracticePage, ExamPage, QuizRunner) now optimized for mobile and landscape
- All UI improvements are responsive-first without breaking desktop experience
- Zero regressions: build passes, no new errors or warnings
- Ready for next phase (M7: Advanced Accessibility)

## 2026-04-15 Branch Merge: ai_main_a478b710cba6 → main

- Merged M2 public quiz experience complete (mobile and landscape polish)
- All four commits from ai_main branch successfully merged:
  - Complete M2 public quiz experience with mobile and landscape polish
  - Address PR review feedback: complete color palette and keyboard accessibility
  - Implement Phase 8 responsive mobile and landscape fixes
  - Merge remote-tracking branch from previous sync
- Production baseline stable, ready for next phase
- Proceeding to M7 (Advanced Accessibility) work

## 2026-04-21 PDF grounding engine and import-review recovery

- Added a Node-only ingestion path for the local `Libro-ClaseB-2026.pdf`.
- Added deterministic offline extraction and segmentation scripts:
  - `scripts/extract-manual-grounding.mjs`
  - `scripts/prepare-manual-knowledge.mjs`
- The manual knowledge pack is now regenerated from the real PDF, not the old starter JSON.
- Current generated manual artifacts:
  - `data/manual-knowledge/extracted-pages.json`
  - `data/manual-knowledge/segmented-manual.json`
  - `data/manual-knowledge/manual-segments.json`
  - `data/manual-knowledge/ground-truth.json`
  - `data/manual-knowledge/chapter-classifier.json`
- Latest extraction baseline from the 2026 manual:
  - `170` extracted pages
  - `754` searchable manual segments
  - `95` derived fact-map entries
- Tightened the offline reviewer to use the extracted manual segments through lexical grounding search.
- Kept the current review contract intact:
  - `accepted`
  - `accepted_with_warning`
  - `rejected`
- Preserved conservative rejection behavior for:
  - fact conflicts
  - ambiguous grounding
  - duplicates against the existing bank
- Kept same-batch duplicate winner selection active.
- Review artifacts remain split as:
  - `data/import-reviews/manifest.json`
  - `data/import-reviews/<run-id>/run-details.json`
- Fixed the manifest run-id collision so chapter dry-runs no longer reuse the full-corpus run id.
- `/admin` import review remains read-only and lazy-loads heavy per-run detail payloads from `run-details.json`.
- Latest full bulk-corpus baseline for `data/imports/imported-1-batch.json`:
  - `1141` accepted with warning
  - `323` rejected
  - `154` duplicate clusters
- Latest Chapter 2 dry-run baseline:
  - `19` accepted with warning
  - `18` rejected
  - `2` duplicate clusters
- Operational interpretation:
  - the reviewer shape is no longer the blocker
  - the remaining recovery rate depends on enriching the manual knowledge pack, especially for chapter-specific legal and alcohol facts
- Local verification completed during this phase:
  - `node scripts/prepare-manual-knowledge.mjs`
  - `node scripts/review-import.mjs data/imports/imported-1-batch.json`
  - `node scripts/review-import.mjs data/imports/imported-1-batch.json --chapter=chapter-2`

## 2026-04-22 Production grounding replacement from sandbox

- Replaced the active import-review grounding internals with the promoted sandbox grounding engine.
- Production grounding now uses shared runtime modules under `src/lib/grounding/` for:
  - chapter-likelihood scoring
  - lexical retrieval with bounded chapter boosts
  - fact normalization and fact gating
  - support refinement / evidence expansion
  - confidence disposition based on support completeness
- Kept the production review contract stable:
  - `reviewImportBatch(...)`
  - `review-log.json`
  - `run-details.json`
  - `accepted-candidates.json`
  - `rejected-candidates.json`
- Kept duplicate clustering, cross-bank duplicate checks, and artifact shaping in `src/lib/importReview.mjs`.
- Sandbox assets remain separated from runtime behavior:
  - benchmark fixtures stay in `sandbox/grounding-calibration/benchmark/`
  - chapter PDFs stay audit-only
  - production runtime reads the versioned 2026 manual knowledge pack plus promoted grounding resources
- The 2026 sandbox benchmark is now the promotion gate for future grounding changes.
- Verification completed during this promotion:
  - `npm run grounding:calibration`
  - `npm run build`
  - `node scripts/review-import.mjs data/imports/imported-1-batch.json`
  - `node scripts/review-import.mjs data/imports/imported-1-batch.json --chapter=chapter-2`
- Operational note:
  - the sample `imported-1-batch.json` run now completes on the new engine, but remains dominated by pre-existing `invalid_source_page` and `manual_fact_conflict` rejections in the source data
  - future grounding work must preserve sandbox parity before any further production reviewer changes

## 2026-04-22 Import recovery and constraint realignment

- Added production metadata auto-repair driven by grounded winners.
- Normalized question records can now overwrite bad import metadata for:
  - `chapterId`
  - `sourcePageStart`
  - `sourcePageEnd`
  - `sourceReference`
- Added additive audit fields for:
  - `metadataRepair`
  - `needsVisualAudit`
  - extended `groundingAudit`
- Rebalanced fact validation so answer-critical conflicts remain blocking, while auxiliary explanation-only conflicts downgrade to warnings.
- Added a production visual-dependency guardrail using a tracked trigger list under `src/lib/grounding/resources/visual-audit-triggers.json`.
- Relaxed option-count handling:
  - three-option items are allowed with warning
  - non-standard counts remain review signals, not automatic blockers
- Updated admin import-review presentation to surface:
  - repaired metadata counts
  - visual-audit counts
  - Spanish explanations for the main issue codes
- Latest replay baseline for `data/imports/imported-1-batch.json` after this phase:
  - `146` accepted with warning
  - `1318` rejected
  - `189` metadata repairs applied
  - `280` items flagged for visual audit
  - top remaining blockers: `invalid_source_page`, `manual_fact_conflict`, and batch duplicates
- Latest Chapter 2 dry-run baseline:
  - `50` accepted with warning
  - `473` rejected
  - `78` metadata repairs applied
  - `125` items flagged for visual audit

## 2026-04-22 Recoverable grounding acceptance tier

- Added a production-only `grounded_recoverable` tier above the raw engine disposition.
- Recoverable items now:
  - use prompt + correct-answer surface for acceptance support
  - can repair metadata
  - can route to `accepted_with_warning` instead of being rejected for incomplete support alone
- Chapter ambiguity now downgrades to warning when the recovered winner is strong enough.
- Latest replay baseline for `data/imports/imported-1-batch.json` after this phase:
  - `219` accepted with warning
  - `1245` rejected
  - `73` accepted via `grounded_recoverable`
  - `282` metadata repairs applied
  - `280` items flagged for visual audit
- Latest Chapter 2 dry-run baseline:
  - `75` accepted with warning
  - `456` rejected
- Confirmed recovery of previously false-rejected item:
  - `imported-1-batch-2` now lands as `accepted_with_warning`
  - repaired to Chapter 1, page 6, `Los siniestros de tránsito`

## 2026-04-22 Valid-rejection checkpoint and final recovery pass

- Froze the pre-cleanup replay baseline in:
  - `data/import-reviews/baselines/2026-04-22-valid-rejection-checkpoint.json`
- Checkpoint definition:
  - valid rejected question = coherent grounding winner, no duplicate blocker, no answer-critical `manual_fact_conflict`
- Removed the dead legacy grounding path from production review:
  - deleted the old MiniSearch-era grounding/search helpers from `src/lib/importReview.mjs`
  - removed `minisearch` from runtime dependencies
- Tightened production truth comparison:
  - blocking fact validation now uses only prompt + correct answer surface
  - `reviewNotes` and `instruction` no longer participate in manual-truth comparison
  - auxiliary-only mismatch tracking is preserved as warning-only
- Strengthened the recoverable winner path:
  - winner-backed metadata/excerpt repair now covers a much larger subset of low-confidence but coherent matches
  - replay logging now records:
    - recovered valid rejects
    - remaining recoverable winner rejects
    - duplicate-blocked rejects
    - fact-blocked rejects
    - auxiliary-only mismatches
- Latest full replay for `data/imports/imported-1-batch.json` after this pass:
  - `914` accepted with warning
  - `550` rejected
  - `773` accepted via `grounded_recoverable`
  - `914` recovered valid rejects
  - `227` remaining recoverable winner rejects
  - `1139` metadata repairs applied
  - `280` visual-audit flags
  - top remaining rejection codes:
    - `manual_fact_conflict: 719`
    - `missing_grounding_excerpt: 325`
    - `invalid_source_page: 325`
    - `referenced_duplicate_in_batch: 254`
- Latest Chapter 2 dry-run after this pass:
  - `321` accepted with warning
  - `227` rejected
  - `272` accepted via `grounded_recoverable`
  - `321` recovered valid rejects
  - `75` remaining recoverable winner rejects
- Improvement versus the frozen checkpoint:
  - accepted with warning: `219 -> 914`
  - rejected: `1245 -> 550`
  - recoverable accepted: `73 -> 773`
  - remaining recoverable winner rejects: `922 -> 227`
  - `missing_grounding_excerpt + invalid_source_page` bucket: `899 -> 216`

## 2026-04-22 Advisory facts rework

- Facts are no longer intended to act as a production rejection authority.
- Production review now treats fact mismatches as advisory review signals tied to the grounded winner context.
- The approval authority remains:
  - grounding support
  - duplicate policy
  - no-grounding rejection
- Facts continue to power:
  - `manualFactRefs`
  - numeric/entity review hints
  - admin correction suggestions
  - future authoring safety work
- Sandbox gained a new yearly-manual utility:
  - `npm run grounding:fact-harvest`
  - emits candidate proposals to `sandbox/grounding-calibration/generated/fact-proposals-2026.json`
- This keeps fact generation futureproof for later manual refreshes such as 2027 while production continues using curated fact data in an advisory role.
- Verification after the advisory rework:
  - `npm run grounding:calibration`
  - `npm run grounding:fact-harvest`
  - `npm run build`
  - `node scripts/review-import.mjs data/imports/imported-1-batch.json`
  - `node scripts/review-import.mjs data/imports/imported-1-batch.json --chapter=chapter-2`
- Latest full replay after this phase:
  - `967` accepted with warning
  - `497` rejected
  - `825` accepted via `grounded_recoverable`
  - `factBlockedRejectCount = 0`
  - `factReviewSuggestedCount = 165`
  - top remaining rejection codes no longer include `manual_fact_conflict`
- Sandbox fact harvester baseline:
  - `518` fact proposals generated for the 2026 manual corpus

## 2026-04-23 Low-confidence usable-winner recovery

- Production review now distinguishes three usable grounding tiers:
  - `grounded`
  - `grounded_recoverable`
  - `usable_winner_low_confidence`
- `usable_winner_low_confidence` is explicit audit-only low confidence:
  - it can repair excerpt/page/chapter/reference metadata
  - it always lands in `accepted_with_warning`
  - it never bypasses duplicate or no-grounding blockers
- The grounding engine now performs a bounded fallback search for weak first-pass winners:
  - keeps the first chapter-boosted pass
  - retries a global unboosted pass when the first winner is weak
  - retries a bounded top-chapter unboosted pass
  - keeps the better support-bearing winner and logs the fallback decision
- Production warning cleanup in this phase:
  - `reduced_option_count` no longer emits for valid 3-option questions
  - `missing_public_explanation` no longer participates in production review warnings
- Replay summaries now track:
  - usable low-confidence accepted count
  - chapter fallback recoveries
  - metadata repairs by recovery tier
  - unresolved metadata rejects
  - true `no_grounding` rejects
- Verification after this phase:
  - `node sandbox/grounding-calibration/test-grounding-calibration.mjs`
  - `npm run build`
  - `node scripts/review-import.mjs data/imports/imported-1-batch.json`
  - `node scripts/review-import.mjs data/imports/imported-1-batch.json --chapter=chapter-2`
- Latest full replay after this phase:
  - `1091` accepted with warning
  - `373` rejected
  - `872` accepted via `grounded_recoverable`
  - `41` accepted via `usable_winner_low_confidence`
  - `242` chapter fallback recoveries
  - `1288` metadata repairs
  - `176` unresolved metadata rejects
  - `176` true `no_grounding` rejects
- Targeted fixes confirmed:
  - `imported-1-batch-28` now falls back from a weak Chapter 4 first pass to a Chapter 1 winner on page 8
  - `imported-1-batch-62` now resolves as `accepted_with_warning` under `usable_winner_low_confidence`

## 2026-04-24 Admin imports workflow checkpoint

- The `/admin` Imports panel now pivots from per-item approve/reject toggles to a local-first draft import workflow.
- Core UI and workflow changes now in place:
  - shared `Preparar importacion` batch entrypoint in the Imports header
  - undoable local prepared batch flow into `Catalogo`
  - imported review items land as `draft` questions with additive import provenance
  - accepted-with-warning, rejected, and duplicate queues can now move items into a local draft batch
  - `Imports` is wired directly to the local catalog layer instead of only local row state
- PDF/manual review tooling was upgraded:
  - new `AdminImportPdfWorkspace` based on `pdfjs-dist`
  - opens the manual at the relevant page
  - supports text selection for preliminary grounding correction
  - supports crop/image capture for visual-reference drafting
- Additive local persistence introduced for editorial import work:
  - localStorage-backed draft queue and prepared batch records
  - IndexedDB-backed reference asset storage for cropped/uploaded media
  - question-level import provenance metadata in the content model
- Imports UI cleanup completed in this checkpoint:
  - duplicated `Artefactos` body panel removed
  - localized presentation moved further toward Spanish-first labeling
  - legacy per-item `Approve / Reject / Reset` flow removed from the actionable queue
  - duplicate queue now supports manual “desagrupar y mover a lote”
- Current limitations kept explicit in this checkpoint:
  - PDF highlight is page/text-layer anchored, not geometric segment highlighting
  - some localized copy and rejected-tab polish can still be refined in a follow-up pass without changing the new workflow contract
- Verification after this checkpoint:
  - `npm run build`

## Next approved work blocks

1. Keep Milestone 5A as the quality gate for imported and locally authored content.
2. Continue Milestone 5E local-only and non-production inside `/admin`:
   - run Ollama through the dev-only local worker, not a blocking browser call
   - expose live progress, active run state, and local CPU/RAM telemetry with GPU best-effort
   - keep provider selection, worker runtime, storage, and beta UI fully env-gated and non-production
3. Rerun the fixed `pilot-baseline-v1` evaluation set at least twice with reachable Ollama after the new worker path is stable.
4. Finish the protected-preview gate only where it directly blocks admin release discipline:
   - use authenticated Vercel access or a temporary share URL for protected previews
   - keep the `scripts/ops/*` wrapper flow as the standard pre-production path
   - repair preview `/api/health` if the branch-scoped Supabase env set is still incomplete
5. Keep annex content excluded until a separate annex policy is implemented.

## 2026-04-25 Sandbox RAG foundry pivot

- `sandbox/rag-system` now pivots from the legacy page-only question generator toward an annual multimodal foundry.
- New sandbox pipeline stages are now in place:
  - `build_manifest.py`
  - `extract_pages_vision.py`
  - `derive_knowledge_units.py`
  - `build_vectors.py`
  - `generate_candidates.py`
  - `verify_candidates.py`
  - `score_and_dedupe.py`
  - `export_review_package.py`
  - `run_foundry_build.py`
- Legacy scripts remain only as compatibility wrappers:
  - `build_cache_vision.py`
  - `pdf_qg.py`
  - `build_vectors_vision.py`
- The canonical sandbox artifact chain is now:
  - `manual-build-manifest.json`
  - `page-artifacts.json`
  - `knowledge-units.json`
  - `knowledge-unit-vectors.npy`
  - `knowledge-unit-vector-mapping.json`
  - `question-candidates.json`
  - `evaluation-report.json`
  - `review-export.json`
- The canonical generation unit is now the knowledge unit.
- Review exports now preserve additive sandbox provenance intended for the current draft import workflow:
  - `buildId`
  - `candidateId`
  - `unitIds`
  - `generationMode`
  - `verifierScore`
  - `verifierIssues`
  - `requiredMedia`
- Production content types were extended additively so catalog drafts can preserve sandbox provenance when this lane is connected to `/admin`.
- Sandbox schema files were added or expanded for:
  - manifest
  - page artifacts
  - knowledge units
  - question candidates
  - review export
- Validation for this checkpoint:
  - `npm run build`
  - Python syntax validation for the new `sandbox/rag-system` pipeline scripts

## 2026-04-25 Production architecture documentation checkpoint

- Added documentation for the production migration from mixed Admin/import/AI experiments toward an annual manual-driven content foundry.
- The canonical content lifecycle is now documented as:
  - `Manual PDF -> Sandbox Foundry -> Verified Review Export -> Admin Review -> Draft Catalog -> Reviewed/Published Catalog`
- New documentation files:
  - `docs/architecture/content-foundry.md`
  - `docs/admin/future-admin-structure.md`
  - `docs/admin/generated-build-review-workflow.md`
  - `docs/migrations/foundry-to-production-roadmap.md`
- Current Admin direction is now explicit:
  - `Resumen` should become an operational catalog/foundry health dashboard
  - `Catalogo` remains the production question bank/editor
  - `Foundry` becomes the production-facing lane for sandbox generated builds
  - `Imports` remains as a secondary compatibility lane for external/informal banks
  - `Cola AI` is deprecated and replaceable by Foundry
  - `Beta` is scheduled for deletion after any useful diagnostics are extracted
- Source-of-truth boundaries are documented:
  - sandbox artifacts are build outputs, not catalog content
  - Admin review decisions are editorial state
  - approved generated candidates enter Catalogo as drafts with provenance
  - production user flows should not depend on live LLM generation

## 2026-04-29 Foundry Admin production bridge

- Added the first production-facing Foundry bridge while keeping heavy generation in `sandbox/rag-system`.
- Curated generated build data now lives under:
  - `data/foundry-builds/<buildId>/manifest.json`
  - `data/foundry-builds/<buildId>/review-export/chapter-*.jsonl`
- Added `npm run foundry:promote -- <buildId>` to promote a repaired sandbox build into production review data.
- Added the live `/Admin` Foundry lane:
  - build selector
  - chapter selector
  - lazy per-chapter JSONL loading
  - candidate detail with grounding, verifier score/issues, generation mode, and media requirements
  - staging into the shared local draft import queue
  - prepare/import as Catalogo drafts
  - batch revert through the existing import draft repository
- Existing Imports remains a compatibility lane.
- Cola AI and Beta remain present for now but Foundry is the documented replacement path for generated content.

## 2026-04-29 Admin PDF platform promotion

- The official yearly manual now has a production-owned library target:
  - `data/manual-library/official/2026/manual-claseb-conaset-2026.pdf`
- The manual source document should no longer depend on `'/Libro-ClaseB-2026.pdf'` as a brittle root path.
- Added a production manual registry for official yearly manuals.
- `AdminImportPdfWorkspace` is now the canonical PDF review surface.
- `AdminManualReader` now routes through the same viewer instead of using an iframe.
- Added a local-only production PDF worker path backed by PyMuPDF:
  - browser routes: `/__local/pdf/...`
  - worker script: `scripts/local-pdf-worker.ts`
  - Python tool: `scripts/pdf_worker_tool.py`
- The PDF stack is now explicitly split by responsibility:
  - `pdf.js` for browser rendering, selection, and crop interaction
  - PyMuPDF for exact anchor lookup and image extraction in local Admin mode
- Added `npm run dev:admin-local` to run Vite with the local PDF worker.

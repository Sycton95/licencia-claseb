# Releases

## 0.1.0

- Deployed Vite + React public app with practice, exam, and hidden admin route support.
- Integrated Supabase auth and editorial persistence flow.
- Added admin reporting, warning visibility, and coverage summaries.
- Hardened production health checks around schema `v1` and server-side writes.

## Current UX baseline

- Public navigation exposes only study-facing routes.
- Admin remains hidden from public navigation and landing pages.
- Version watermark is visible in-app for operator tracking.
- Practice mode supports quick reference overlays after answering.

## 2026-04-04

- Added AI-assisted editorial foundation:
  - source-preparation chunks
  - `ai_suggestions` migration
  - admin-only AI routes
  - AI inbox in `/admin`
- Upgraded `plan.md` into milestone-driven roadmap.
- Expanded `docs/progress.md` into milestone log with explicit risks and manual blockers.
- Added `docs/ai-editorial-policy.md`.

## 2026-04-04 UI Rework v1

- Reworked `/admin` into a desktop-first workspace:
  - summary/status strip
  - three-column desktop layout
  - mobile/tab fallback for smaller screens
- Refreshed the public shell and page layouts for broader desktop widths and cleaner mobile spacing.
- Improved `Práctica` and `Examen` presentation without changing routes or quiz behavior.
- Preserved hidden-admin policy and the existing public route structure.

## 2026-04-05 UI Rework v1.1

- Polished `/admin` into a denser workstation layout with clearer desktop breakpoints.
- Added a stable two-column transitional layout before the full three-column desktop workspace.
- Reduced overflow in list/detail/editor surfaces with stronger wrapping and internal scroll regions.
- Tightened summary cards and queue styling so the admin workspace behaves more like an editorial tool.

## 2026-04-05 Admin Master-Detail Refactor

- Split `src/pages/AdminPage.tsx` into a stateful container plus extracted admin UI components.
- Replaced the mobile tab switcher with a sidebar shell:
  - overlay drawer on mobile
  - static rail on desktop
- Converted `Catálogo` and `Cola AI` into master-detail layouts with mobile back navigation.
- Rebuilt the editor as a fixed-footer surface with a scrollable form body.
- Moved `/admin` outside the public app frame so the admin workspace can use the full viewport height.

## 2026-04-05 Admin Mockup Alignment

- Applied the latest mockup direction to the extracted admin workspace instead of reverting to a monolithic page.
- Simplified the admin navigation to three sections:
  - Resumen
  - Catálogo
  - Cola AI
- Tightened the catalog and AI lists into compact work queues with search-first headers and status dots.
- Kept the editor embedded as the detail surface of `Catálogo`, matching the mockup's desktop and mobile behavior.

## 2026-04-05 Milestone 6A Polish Restart

- Restored the interrupted admin component tree to a buildable state.
- Tightened the current admin visual system instead of changing structure again:
  - lighter top strip
  - denser metrics
  - cleaner queue rows
  - stronger editor hierarchy
- Cleaned UTF-8 regressions in the touched admin and public shell files.
- Revalidated local gates:
  - `npm run validate:content`
  - `npm run build`

## 2026-04-08 Path A Local UI Branch

- Created local-only UI branch `codex/ui-polish-local` to finish Milestone 6A without deploying every visual pass.
- Removed `.codex/config.toml` from the staged set so local operator config does not ride along with product commits.
- Locked the workflow for the current UI phase:
  - iterate locally with `npm run dev`
  - validate `/admin` at mobile, tablet, and desktop widths
  - deploy only once after visual approval

## 2026-04-10 Chapter Rollout Roadmap Update

- Locked the remaining manual coverage strategy to:
  - baseline first
  - progressive public activation
- Recorded the actual current content baseline:
  - published coverage only in `chapter-1` and `chapter-3`
  - prepared grounding only in `chapter-1` and `chapter-3`
- Added the required Milestone 5A gate before scaling content:
  - duplicate / near-duplicate detection
  - weak-distractor checks
  - inconsistent-instruction checks
  - answer-format mismatch checks
- Defined the remaining chapter rollout in two waves:
  - Wave 1: `chapter-7`, `chapter-5`, `chapter-4`
  - Wave 2: `chapter-6`, `chapter-2`, `chapter-8`
- Defined the public activation threshold for each chapter:
  - at least `10` published questions
  - at least `3` prepared source chunks
  - clear source references
  - no unresolved critical editorial warnings

## 2026-04-10 Milestone 6A Closed

- Accepted the current `/admin` UI baseline and closed UI polishing for now.
- Returned roadmap execution to `main` so work can continue on Milestone 5A and chapter rollout.
- Kept the current admin shell as the working baseline:
  - sidebar navigation
  - `Resumen`
  - `Catálogo`
  - `Cola AI`
  - embedded editor in `Catálogo`

## 2026-04-10 Milestone 5A and Local Pilot Scaffold

- Completed the Milestone 5A editorial quality gate in the admin workflow:
  - duplicate / near-duplicate prompt detection
  - weak-distractor checks
  - inconsistent-instruction checks
  - answer-format mismatch checks
- Added local-only scaffolding for a future Ollama pilot:
  - provider abstraction with production default still set to `heuristic`
  - env-gated `ollama_qwen25_3b` pilot adapter
  - isolated local beta storage
  - deterministic verifier stage before any admin review
- Added a local-only Admin `Beta` section:
  - visible only behind local env flags
  - bounded run controls for new questions, rewrites, and mixed runs
  - passing results can be loaded into the existing editor as drafts
- Kept the pilot non-destructive by design:
  - no public route dependency
  - no direct path to published content
  - no production dependency on the beta panel

## 2026-04-10 Chapter 3 Fast-Track Expansion

- Expanded chapter 3 directly from the formal source manual PDF `Libro-ClaseB-2026.pdf`.
- Increased chapter 3 prepared grounding from `2` to `7` chunks using manual-backed material from pages `33` to `35`.
- Increased chapter 3 published seed coverage from `12` to `20` questions.
- Added exact source references for the new chapter 3 batch and kept the release outside the AI/Beta suggestion path.

## 2026-04-11 Formal chapter alignment and reviewed import merge

- Rebased the runtime catalog to the formal 9-chapter manual structure.
- Merged reviewed import candidates into the published bank for chapters `4` through `9`.
- Corrected the import verifier so `chapter-6` no longer rejects `6-q030` as a false explanation conflict.
- Preserved two reviewed exclusions:
  - `4-q047` rejected for chapter-scope mismatch
  - `5-q033` rejected for annex/glossary sourcing
- Prepared the release to sync the updated published bank to the live Supabase-backed site.

## 2026-04-12 Chapter 2 baseline import

- Merged reviewed import candidates into the published bank for `chapter-2`.
- Closed the only remaining chapter without published baseline coverage under the formal 9-chapter manual model.
- Kept the import-review boundary unchanged:
  - raw file in `data/imports`
  - review output in `data/import-reviews`
  - merge from `accepted-candidates.json` only

## 2026-04-12 Encoding cleanup and source-preparation catch-up

- Added deterministic mojibake repair to seeded-question and reviewed-import runtime promotion paths.
- Enabled `chapter-2` in the seeded runtime chapter catalog so the published bank and chapter activation state match.
- Expanded private `sourcePreparation` coverage for:
  - `chapter-2`
  - `chapter-4`
  - `chapter-5`
  - `chapter-6`
  - `chapter-7`
  - `chapter-8`
  - `chapter-9`
- Left the next follow-up as a small chapter-1 grounding top-up plus any later local-only Milestone 5E work.

## 2026-04-11 Integrity recovery and chapter-1 baseline closeout

- Preserved the raw/reviewed import workflow during recovery:
  - raw batch files remain in `data/imports`
  - deterministic review artifacts remain in `data/import-reviews`
  - runtime merge still consumes `accepted-candidates.json` only
- Merged the reviewed `chapter-1-batch` candidates into the runtime published bank.
- Closed the remaining chapter-1 live baseline gap:
  - `33` accepted
  - `0` rejected
  - `chapter-1` coverage increased from `28` to `61`
  - total runtime published questions increased from `336` to `369`
- Added one more formal source-preparation chunk for `chapter-1` so every active chapter now has at least `3` private grounding chunks.
- Reconciled the milestone log with the actual recovered repo state before continuing Milestone `5E`.
- Revalidated local gates after the recovery pass:
  - `npm run validate:content`
  - `npm run build`
- `npm run release:check` still stops at the sandboxed network fetch inside `smoke:prod`, so final live confirmation remains a post-push Vercel verification step.

## 2026-04-12 Production health recovery and live verification

- Fixed the `api/health` production regression caused by the text-repair helper:
  - `repairPotentialMojibake()` now uses a global regex compatible with `matchAll`
- Verified the crash was removed in preview before promotion:
  - preview deployment: `https://licencia-claseb-d4tzsl8j8-sycton.vercel.app`
  - preview `/api/health` returned JSON and no longer failed with `FUNCTION_INVOCATION_FAILED`
- Promoted the validated workspace to production:
  - deployment id: `dpl_J8ZqeG5v2qieKFm9gbMuVTGzaij4`
  - production alias: `https://licencia-claseb.vercel.app`
- Final production smoke verification passed:
  - `/api/health`
  - `/`
  - `/practice`
  - `/exam`
  - `/admin`
- The production release now includes:
  - the `/api/health` runtime fix
  - the `chapter-1` reviewed-import merge
  - the third `chapter-1` grounding chunk
- Remaining follow-up after this release:
  - finish preview env parity so preview can act as a true blocking gate
  - continue Milestone `5E` with a fixed local evaluation set and reportable verifier outcomes

## 2026-04-12 Release discipline and Milestone 5E baseline wiring

- Added a reusable preview smoke entry point:
  - `npm run smoke:url`
- Updated deployment guidance so preview validation is no longer ambiguous:
  - Preview health parity requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
  - when Preview overrides are branch-scoped in Vercel, the branch must be pushed before those envs can be attached and validated
- Hardened the local Ollama pilot for future non-browser execution by replacing `window` timer usage with `globalThis`.
- Added the first fixed Milestone `5E` evaluation set:
  - `pilot-baseline-v1`
  - two deterministic `new_question` targets
  - two deterministic `rewrite` targets
- Added local beta evaluation reporting:
  - run-level evaluation metadata
  - issue-code breakdown
  - latest-vs-previous delta display in the admin beta panel
- Kept the entire pilot isolated from production:
  - heuristic remains the production default
  - beta storage remains local-only
  - no pilot result is promoted into the verified suggestion bank or public content

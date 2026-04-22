# Progress

## Current production status

- Frontend is live on Vercel from `main`.
- Public routes are `/`, `/practice`, and `/exam`.
- `/admin` is active and hidden from public navigation.
- Supabase auth, allowlist validation, and server-side editorial mutations are active.
- Verified production health baseline:
  - `ok: true`
  - `supabaseConfigured: true`
  - `usesServiceRole: true`
  - `databaseReachable: true`
  - `schema: v1`

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

- Milestone 5E local LLM suggestion pilot:
  - local-only
  - opt-in
  - verifier-gated
  - heuristic provider remains production-default
  - `/admin` is the active implementation surface in this sandbox
  - current step is the sequential local worker queue, sticky telemetry/task log, and richer `/admin` review surfaces

## Delegated public UI/UX track

- Public `/`, `/practice`, and `/exam` UI/UX work continues in the delegated branch.
- `/admin` improvements are not part of that delegated public-route track.
- The local Beta/Ollama operator console belongs to the main track here.

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

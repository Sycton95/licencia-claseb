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

## Active milestone

- Milestone 5E local LLM suggestion pilot:
  - local-only
  - opt-in
  - verifier-gated
  - heuristic provider remains production-default
  - content baseline, import review, and source-preparation coverage are now materially stronger than before

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
  - `chapter-1`: 28 questions
  - `chapter-2`: 40 questions
  - `chapter-3`: 20 questions
  - `chapter-4`: 49 questions
  - `chapter-5`: 39 questions
  - `chapter-6`: 40 questions
  - `chapter-7`: 40 questions
  - `chapter-8`: 40 questions
  - `chapter-9`: 40 questions
- Source-preparation chunks now exist for:
  - `chapter-1`: 2 chunks
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
- `chapter-1` remains at `2` prepared chunks and is now the only active chapter below the `3`-chunk private grounding target.

## Open risks

- Current production AI provider is heuristic and grounded, not model-backed. This is intentional for safety, but it limits suggestion breadth.
- The local Ollama pilot is intentionally not production-ready:
  - no background worker yet
  - bounded local runs only
  - suggestion output quality still unproven on target hardware
  - browser-local persistence only in this phase
- Chapter 3 was expanded directly from the formal manual PDF in a fast-track pass.
  - The new batch is grounded to pages 33, 34, and 35 only.
- `chapter-1` still needs one additional prepared chunk to meet the same `3`-chunk grounding threshold now reached by the imported live chapters.
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

## Next approved work blocks

1. Add one more formal source-preparation chunk for `chapter-1` so every active chapter meets the `3`-chunk grounding threshold.
2. Keep Milestone 5A as the quality gate for imported and locally authored content.
3. Keep Milestone 5E local-only and non-production:
   - provider abstraction
   - verifier-gated local Ollama adapter
   - isolated beta storage
   - local Admin Beta panel
4. Keep annex content excluded until a separate annex policy is implemented.

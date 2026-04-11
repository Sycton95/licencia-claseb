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
  - local Admin `Beta` section now available behind env flags

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

- Published seed coverage exists only for:
  - `chapter-1`: 28 questions
  - `chapter-3`: 20 questions
- Source-preparation chunks exist only for:
  - `chapter-1`: 2 chunks
  - `chapter-3`: 7 chunks
- The remaining manual chapters without baseline coverage are:
  - `chapter-2`
  - `chapter-4`
  - `chapter-5`
  - `chapter-6`
  - `chapter-7`
  - `chapter-8`

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

## Open risks

- Current production AI provider is heuristic and grounded, not model-backed. This is intentional for safety, but it limits suggestion breadth.
- The local Ollama pilot is intentionally not production-ready:
  - no background worker yet
  - bounded local runs only
  - suggestion output quality still unproven on target hardware
  - browser-local persistence only in this phase
- Chapter 3 was expanded directly from the formal manual PDF in a fast-track pass.
  - The new batch is grounded to pages 33, 34, and 35 only.
  - Broader chapter rollout remains deferred; coverage is still uneven outside chapters 1 and 3.

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

1. Keep Milestone 5A as the active quality gate for content review.
2. Add the local-only Milestone 5E pilot:
   - provider abstraction
   - verifier-gated local Ollama adapter
   - isolated beta storage
   - local Admin Beta panel
3. Start remaining chapter expansion with a baseline-first, progressive-activation policy.
4. Roll out chapter coverage in two waves:
   - Wave 1: `chapter-7`, `chapter-5`, `chapter-4`
   - Wave 2: `chapter-6`, `chapter-2`, `chapter-8`
5. Activate each chapter publicly only after it reaches:
   - at least `10` published questions
   - at least `3` prepared source chunks
   - clear source references
   - no unresolved critical editorial warnings

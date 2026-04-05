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

- Milestone 6A implementation pass:
  - admin workstation polish
  - responsive two-column to three-column desktop transition
  - public-shell consistency cleanup

## Completed milestones

- Milestone 1: Governance and progress safety
  - `plan.md` expanded into a milestone roadmap
  - `docs/progress.md` formalized as operational log
  - release discipline and autonomy rules documented
- Milestone 2: Content preparation for AI
  - initial source-preparation chunks added for currently covered chapters
  - grounding policy aligned to formal sources
- Platform baseline milestones completed earlier:
  - Vite SPA deployed and connected to GitHub -> Vercel production
  - Supabase integrated for public reads and admin auth
  - server-side admin write routes enabled in production
  - editorial workflow implemented with `draft`, `reviewed`, `published`, and `archived`
  - admin reporting added for status counts, chapter coverage, source coverage, and warnings
  - magic link redirect stabilized to use the canonical production admin URL
  - public UI cleaned up and admin hidden from navigation

## Outcomes from the current implementation pass

- Tightened `/admin` into a denser workstation layout:
  - mobile tabs below `960px`
  - two-column transitional workspace from `960px`
  - full three-column workstation from `1280px`
- Reduced admin overflow risk with:
  - internal scroll regions
  - denser summary cards
  - compact question and AI work-queue rows
  - stronger wrap and max-height behavior in text-heavy panels
- Reworked `/admin` into a desktop-first workspace with:
  - top summary/status strip
  - mobile/tab fallback
  - three-column desktop layout for question list, AI queue, diagnostics, and editor
- Refreshed the public shell with:
  - broader desktop frame width
  - cleaner header and footer hierarchy
  - more concise home menu and section grouping
- Improved `Práctica` and `Examen` presentation with:
  - two-column desktop builders
  - clearer quiz sidebar and content split
  - stronger quick-reference drawer presentation in `Práctica`
- Added `ai_suggestions` and `ai_runs` migration in:
  - `supabase/migrations/0003_ai_suggestions.sql`
- Added private source-preparation layer in:
  - `src/data/sourcePreparation.ts`
- Added heuristic AI suggestion engine for:
  - new question candidates
  - rewrite suggestions
  - flag suggestions
  - coverage gap suggestions
- Added admin-only API route:
  - `api/admin/ai-suggestions.ts`
- Added AI inbox in `/admin` with:
  - summary counts
  - type/status/chapter/source filters
  - grounded suggestion detail
  - create-draft / load-into-editor / defer / reject actions

## Open risks

- Current AI provider is heuristic and grounded, not model-backed. This is intentional for safety, but it limits suggestion breadth.
- Source-preparation coverage currently exists only for the chapters already better represented in the bank. Broader chapter coverage still requires more prepared chunks.
- Server route type-checking is now part of the local verification path, but the smoke check still depends on network access.
- The shell-based smoke check still cannot reach production from this sandbox, so live verification must continue through Vercel/browser checks after push.

## Blocked or manual steps

- Re-authenticate the Vercel connector in-session whenever live deployment verification is needed after a push.
- Use browser/Vercel confirmation after each UI-heavy release because shell fetches from this sandbox still cannot reach production.

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

## Latest regressions or blocked items

- None in the public app baseline.
- No current platform blocker. The remaining gap is better live verification tooling inside this session after pushes.

## Next approved work blocks

1. Verify the new `/admin` desktop workspace and public responsive shell on production after this release.
2. Start Milestone 5:
   - duplicate prompt detection
   - weak distractor heuristics
   - richer review-task surfacing
3. Resume chapter-by-chapter content expansion through the AI-assisted review flow.
4. Keep logging each milestone close-out in `docs/progress.md` and `docs/releases.md` before opening the next work block.

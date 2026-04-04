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

- Milestone 3 and Milestone 4 implementation pass:
  - AI suggestion data model
  - source-preparation scaffolding
  - server-side suggestion APIs
  - admin AI inbox

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

- Production persistence for the AI inbox depends on applying `0003_ai_suggestions.sql` in Supabase.
- Current AI provider is heuristic and grounded, not model-backed. This is intentional for safety, but it limits suggestion breadth.
- Source-preparation coverage currently exists only for the chapters already better represented in the bank. Broader chapter coverage still requires more prepared chunks.
- Server route type-checking is now part of the local verification path, but the smoke check still depends on network access.
- The shell-based smoke check still cannot reach production from this sandbox, so live verification must continue through Vercel/browser checks after push.

## Blocked or manual steps

- Apply `supabase/migrations/0003_ai_suggestions.sql` in Supabase SQL Editor.
- After migration, verify live `/admin` AI inbox against production.

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
- AI persistence is pending migration, by design, and should degrade cleanly until then.

## Next approved work blocks

1. Apply migration `0003_ai_suggestions.sql` and verify production AI inbox.
2. Close Milestones 3 and 4 in production verification notes.
3. Start Milestone 5:
   - duplicate prompt detection
   - weak distractor heuristics
   - richer review-task surfacing
4. Resume chapter-by-chapter content expansion through the AI-assisted review flow.

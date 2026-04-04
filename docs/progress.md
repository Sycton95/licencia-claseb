# Progress

## Current production status

- Frontend is live on Vercel from `main`.
- Public routes are `/`, `/practice`, and `/exam`.
- `/admin` is active, but intended for direct URL access only.
- Supabase auth, allowlist validation, and server-side editorial mutations are active.
- Production health target is `schema: v1` and `usesServiceRole: true`.

## Completed milestones

- Vite SPA deployed and connected to GitHub -> Vercel production.
- Supabase integrated for public reads and admin auth.
- Server-side admin write routes enabled in production.
- Editorial workflow implemented with `draft`, `reviewed`, `published`, and `archived`.
- Admin reporting added for status counts, chapter coverage, source coverage, and warnings.
- Magic link redirect stabilized to use the canonical production admin URL.

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

## Known cleanup items

- Continue removing internal product/process language from public screens as UX evolves.
- Study mode is not yet public and should not ship before content/legal notes are documented.
- Practice quick reference should use concise editorial snippets, not long raw manual extracts by default.

## Next approved work blocks

1. Public UX cleanup and responsive shell polish.
2. Practice quick-reference refinement and better review flow.
3. Content expansion by chapter with stronger editorial QA.
4. Study mode feasibility and documentation before any public PDF feature.

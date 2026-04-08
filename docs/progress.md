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

- Milestone 6A final polish pass:
  - admin workstation visual consistency
  - overflow cleanup
  - UTF-8 cleanup in touched admin/public shell files
  - local-only iteration on branch `codex/ui-polish-local`
  - no intermediate UI deployments until visual approval
  - pending final live `/admin` verification before close-out

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
- Milestones 3 and 4 operationally implemented:
  - `ai_suggestions` and `ai_runs` persistence
  - admin AI inbox
  - grounded suggestion review actions

## Outcomes from the current implementation pass

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

## Open risks

- Live verification for the latest Milestone 6A polish pass is still pending.
- Repeated deploy-first UI iteration has been the main source of churn. The current branch policy is to validate UI locally first and deploy once after signoff.
- Current AI provider is heuristic and grounded, not model-backed. This is intentional for safety, but it limits suggestion breadth.
- Source-preparation coverage currently exists only for the chapters already better represented in the bank. Broader chapter coverage still requires more prepared chunks.

## Blocked or manual steps

- `.codex/config.toml` was removed from the staged set and should remain out of product commits.
- Continue UI work on `codex/ui-polish-local`, not on `main`.
- Re-authenticate the Vercel connector in-session whenever final live deployment verification is needed after the approved merge/push.
- Use browser/Vercel confirmation for the final approved UI release.
- Before closing Milestone 6A, verify `/admin` on:
  - desktop `>=1280px`
  - tablet around `1100px`
  - mobile `<960px`

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

- No platform regression is currently blocking local development.
- Milestone 6A is waiting on local signoff and one final live verification, not on another structural rewrite.

## Next approved work blocks

1. Iterate locally on `/admin` inside `codex/ui-polish-local` until the visual pass is approved.
2. Merge the approved UI work into `main`, deploy once, and close Milestone 6A.
3. Switch the active roadmap back to Milestone 5:
   - duplicate prompt detection
   - weak distractor heuristics
   - richer review-task surfacing
4. Resume chapter-by-chapter content expansion through the AI-assisted review flow.
5. Keep logging each milestone close-out in `docs/progress.md` and `docs/releases.md` before opening the next work block.

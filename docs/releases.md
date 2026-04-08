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

Pending after this release:

- apply `0003_ai_suggestions.sql`
- verify AI inbox in production

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
- Kept the editor embedded as the detail surface of `Catálogo`, matching the mockup’s desktop and mobile behavior.

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

Pending after this release:

- complete the local `/admin` polish loop
- merge or cherry-pick the approved branch work into `main`
- run the release gate and perform one final deployment for Milestone 6A

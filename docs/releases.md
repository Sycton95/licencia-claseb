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
# Releases

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

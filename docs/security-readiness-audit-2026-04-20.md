# Production Readiness Audit (Sanity, Security, Safety)

Date: 2026-04-20
Scope: repo codebase, Vercel deployment config, Supabase schema and access model.

## Executive summary

Current posture is **close to production-ready**, with the biggest prior gaps being:

1. missing baseline HTTP security headers at the Vercel edge,
2. missing indexes on several Supabase foreign keys that are used in admin joins / RLS-adjacent query paths.

Both were addressed in this audit.

## What was checked

### Sanity

- Build and typecheck for front-end and API TS project references.
- Review of API method guards and JSON response handling.
- Review of environment variable contract (`.env.example`) against code usage.

### Security

- Review of auth flow for admin API routes (`requireAdmin`) and server/client Supabase key handling.
- Review of Supabase RLS policies and admin-only controls.
- Review of deployment config hardening on Vercel.
- Quick dependency audit attempt (`npm audit`) with environment limitation noted.

### Safety / abuse resistance

- Verified admin mutations require authenticated admin session checks.
- Verified public question access is filtered to published state unless admin.
- Reviewed fallback modes (`local admin`, preview bypass) to ensure they are opt-in via env flags.

## Findings and actions

## ✅ Implemented during this audit

1. **Vercel edge hardening headers added** in `vercel.json`:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

2. **Supabase FK/performance indexes added** in a new migration:
   - Covers frequently joined relational columns (`edition_id`, `question_id`, etc.)
   - Reduces risk of full scans under growth and improves admin/reporting query stability.

## ⚠️ Requires manual verification in production environment

1. **`npm audit` registry access** was blocked (`403 Forbidden`) in this CI/container context.
   - Action: run `npm audit --audit-level=moderate` in your Vercel build context or local machine with normal npm registry access.

2. **Supabase dashboard/runtime checks** (not available from repo-only static review):
   - Confirm leaked/revoked keys policy and key rotation cadence.
   - Confirm Auth URL allowlist only includes intended domains.
   - Confirm database PITR/backups, alerting, and retention are enabled per your SLA.

## Residual risk notes

- `VITE_ENABLE_LOCAL_ADMIN` and `VITE_ENABLE_PREVIEW_ADMIN_BYPASS` are powerful switches. Keep both disabled in production.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only in Vercel env vars (never `VITE_` prefixed, never committed).
- Consider adding server-side rate limiting and structured audit logs on admin routes before public launch.

## Launch checklist

- [ ] Production env vars set and validated (`VITE_SUPABASE_URL`, publishable key, service role key server-side only).
- [ ] `VITE_ENABLE_LOCAL_ADMIN=false` in production.
- [ ] `VITE_ENABLE_PREVIEW_ADMIN_BYPASS=false` in production.
- [ ] Supabase Auth redirect URLs restricted to exact expected domains.
- [ ] RLS policies tested with anon/authenticated/admin roles.
- [ ] Run `release:check` against production URL before DNS cutover.
- [ ] Establish key rotation and incident rollback procedure.

# Ops Wrappers

PowerShell wrappers for repeatable, low-risk Vercel and Supabase checks.

## Safety model

- preview-only mutations must target `codex/*`
- `main` and production targets are rejected
- preview env sync only allows:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- wrappers do not delete deployments, env vars, or local files
- env values are trimmed before validation and sync

## Wrappers

- `vercel-deployment-list.ps1`
  - read-only deployment listing
- `vercel-inspect.ps1`
  - read-only deployment summary as JSON
- `vercel-preview-share.ps1`
  - resolves a preview alias and creates or reuses a share URL
- `vercel-preview-smoke.ps1`
  - validates `/`, `/practice`, `/exam`, `/admin`, `/api/health`
  - with `-UseShareUrl`, it first bootstraps a cookie-backed session for protected previews
- `vercel-preview-env-sync.ps1`
  - syncs the approved preview envs for one `codex/*` branch
- `supabase-env-sanity.ps1`
  - validates that required Supabase values exist and are non-empty after trimming

## Examples

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ops\vercel-deployment-list.ps1 -Limit 5
powershell -ExecutionPolicy Bypass -File .\scripts\ops\vercel-inspect.ps1 -UrlOrId https://licencia-claseb-7xgigde9f-sycton.vercel.app
powershell -ExecutionPolicy Bypass -File .\scripts\ops\vercel-preview-share.ps1 -Url https://licencia-claseb-7xgigde9f-sycton.vercel.app
powershell -ExecutionPolicy Bypass -File .\scripts\ops\vercel-preview-smoke.ps1 -BaseUrl https://licencia-claseb-7xgigde9f-sycton.vercel.app -UseShareUrl
powershell -ExecutionPolicy Bypass -File .\scripts\ops\vercel-preview-env-sync.ps1 -Branch codex/release-discipline-5e-baseline -ClientEnvFile .\.env.local -ServerEnvFile .\secure\.env.server.local
powershell -ExecutionPolicy Bypass -File .\scripts\ops\supabase-env-sanity.ps1 -ClientEnvFile .\.env.local -ServerEnvFile .\secure\.env.server.local
```

## Current repo state

- protected preview share-link flow is working
- protected preview smoke reaches the app successfully
- current preview still fails on `/api/health` with `503`, so the wrapper surface is ready but preview env/runtime parity still needs one more fix
- `.env.production.local` currently fails `supabase-env-sanity.ps1` because `SUPABASE_SERVICE_ROLE_KEY` is blank in that file

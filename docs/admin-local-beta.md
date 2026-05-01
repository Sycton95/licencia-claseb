# Admin Local Beta (Ollama)

This document is the source of truth for the local-only Ollama workflow used by `/admin`.

Status:

- legacy and opt-in
- not the recommended default local Admin flow
- the supported launcher path is now `npm run dev:admin-local` or `launchers/01-admin-local.cmd`
- Milestone 1 validation should use `npm run dev:admin-local` first and treat Beta as secondary diagnostics only

## Scope

- Local-only
- Opt-in
- Dev-only
- Never production-default
- No public route exposure

The Beta panel exists to evaluate bounded Ollama runs before any editorial draft is accepted manually.

## Required flags

Set these in `.env.local` for local admin Beta work:

```bash
VITE_ENABLE_LOCAL_ADMIN=true
VITE_ENABLE_ADMIN_BETA_PANEL=true
VITE_ENABLE_LOCAL_OLLAMA=true
```

Optional tuning:

```bash
VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434
VITE_OLLAMA_MODEL=qwen2.5:3b
VITE_OLLAMA_MAX_GENERATION_MS=15000
VITE_OLLAMA_MAX_ITEMS_PER_RUN=3
LOCAL_OLLAMA_WORKER_PORT=4789
```

## Required local processes

Use the combined command:

```bash
npm run dev:admin-beta
```

That starts:

1. Vite for the web app
2. the local Ollama worker on `127.0.0.1`
3. the local PDF worker on `127.0.0.1`

You still need Ollama running locally with the selected model available.
Do not use this path as the default smoke or startup verification flow for the editorial workspace.

## Expected `/admin` behavior

When the flags are on and the worker is running:

- `/admin` shows the `Beta` section
- the Beta panel verifies worker health and Ollama reachability
- runs start in the background and return a `runId` immediately
- the panel polls progress every 1-2 seconds
- completed runs are mirrored into the browser-local Beta workspace for comparison

When the worker is unavailable:

- the Beta panel stays visible
- setup state explains what is missing
- no production or Supabase write path is used for Beta execution

## Runtime model

- Active run state lives in the local worker memory
- Completed results are mirrored into browser-local storage for report history
- Progress is deterministic:
  - each evaluation target counts as one work unit
  - percent is based on completed items over total items
- Telemetry is local-only:
  - CPU and RAM are guaranteed
- GPU is best-effort on Windows

## Shared local runtime contract

Both local Admin entrypoints now use the same orchestration model:

- `npm run dev:admin-local`
- `npm run dev:admin-beta`

The orchestrator resolves free ports for:

- Vite
- local Ollama worker when `dev:admin-beta` is used
- local PDF worker

and writes:

```text
.tmp/admin-local-runtime.json
```

This file records the active Admin URL and worker URL for smoke checks and debugging.

Verify the active local runtime with:

```powershell
npm run smoke:admin-local
```

This command checks:

- the current `adminUrl`
- the local PDF worker health endpoint
- availability of `manual-claseb-2026`

Warning thresholds:

- CPU warning: `>= 85%`
- RAM warning: `>= 85%`
- GPU warning: `>= 90%` when available

## Safety rules

- Beta output is never public content
- Beta output never auto-publishes
- Beta output must still pass verifier checks before loading into the editor
- Production keeps the heuristic provider as the only default-active provider

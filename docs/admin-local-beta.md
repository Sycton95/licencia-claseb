# Admin Local Beta (Ollama)

This document is the source of truth for the local-only Ollama workflow used by `/admin`.

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

You still need Ollama running locally with the selected model available.

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

Warning thresholds:

- CPU warning: `>= 85%`
- RAM warning: `>= 85%`
- GPU warning: `>= 90%` when available

## Safety rules

- Beta output is never public content
- Beta output never auto-publishes
- Beta output must still pass verifier checks before loading into the editor
- Production keeps the heuristic provider as the only default-active provider

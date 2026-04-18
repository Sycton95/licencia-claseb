# Admin Workflow: Beta Ollama

## Purpose

The Beta panel is the local-only operator console for testing Ollama-driven suggestion generation inside `/admin`.

It exists to measure and inspect model output under verifier control without changing production defaults.

Production default remains the heuristic provider.

## Enablement

Required flags:

- `VITE_ENABLE_LOCAL_ADMIN=true`
- `VITE_ENABLE_ADMIN_BETA_PANEL=true`
- `VITE_ENABLE_LOCAL_OLLAMA=true`

Useful optional flags:

- `VITE_OLLAMA_BASE_URL`
- `VITE_OLLAMA_MODEL`
- `VITE_OLLAMA_MAX_GENERATION_MS`
- `VITE_OLLAMA_MAX_ITEMS_PER_RUN`
- `LOCAL_OLLAMA_WORKER_PORT`

Recommended startup:

- `npm run dev:admin-beta`

That starts:

- Vite
- the dev-only local Ollama worker

## Local-only boundaries

The Beta workflow is:

- opt-in
- local-only
- verifier-gated
- not production-default
- not a publication path

Completed Beta outputs may be loaded into the editor only by explicit admin action, and only after the operator inspects the verifier result.

## Worker endpoints

Current local worker contract:

- `GET /__local/ollama/health`
- `GET /__local/ollama/metrics`
- `POST /__local/ollama/runs`
- `GET /__local/ollama/runs/:id`
- `POST /__local/ollama/runs/:id/cancel`

## Runtime controls in `/admin`

The Beta console exposes:

- `timeout`
- `max runs`
- `new_question` count
- `rewrite` count

These controls shape a local deterministic run over the fixed evaluation pool.

They do not let the operator choose arbitrary source items yet.

## Evaluation pool

The current fixed local baseline set remains deterministic:

- set id: `pilot-baseline-v1`
- new-question targets:
  - `prep-system-safe-components`
  - `prep-convivencia-vial-space`
- rewrite targets:
  - `week1-q01`
  - `import-chapter-2-q001`

The operator chooses counts; the worker slices from this ordered pool.

## Sequential task queue model

Each run now becomes a queue of individual tasks.

Each task is exactly one of:

- one `new_question`
- one `rewrite`

Execution rules:

- only one active run at a time
- only one Ollama task in flight at a time
- each finished task is appended to the in-memory run log
- completed results are persisted back into the existing local Beta workspace/report model

## Active run state

The active run now carries:

- `runId`
- `status`
- `mode`
- `evaluationSetId`
- `config`
- `startedAt`
- `completedAt`
- `totalItems`
- `completedItems`
- `currentItemLabel`
- `currentStep`
- `progressPercent`
- `queuedTasks`
- `currentTask`
- `completedTasks`
- `logEntries`
- `error`

## Live operator surfaces

The Beta desktop layout is now:

- collapsible left operator/results pane
- center detail/review surface
- sticky right rail for telemetry and live batch log

### Telemetry

Telemetry reports:

- CPU percentage
- RAM percentage
- RAM used / total
- GPU percentage when available
- GPU status when unavailable
- warning badges

Current warning thresholds:

- CPU `>= 85%`
- RAM `>= 85%`
- GPU `>= 90%`

### Batch log

The log is append-only for the current run and shows:

- run creation
- run start
- current task transitions
- per-task completion outcome
- cancellation or failure
- final completion

The log remains visible after completion until the next run or page reset.

## Result records

Each completed Beta record still stores:

- provider
- raw model output
- generated suggestion payload
- verifier status
- verifier issues
- timestamps

The latest report still stores:

- attempted count
- passed count
- failed count
- critical issue total
- warning issue total
- issue-code breakdown

## Review actions

The Beta operator can:

- refresh runtime state
- start a new run
- cancel an active run
- inspect completed results
- discard a stored result
- load a verifier-passed result into the editor
- open related-question references
- open the manual reader for PDF-backed references

## Manual reader

The current implementation is local-first and uses the repo manual asset:

- `Libro-ClaseB-2026.pdf`

The reader supports:

- open at page
- previous/next page
- zoom in/out/reset
- page jump
- close

If the source is not embeddable as a PDF in the current context, the UI degrades without breaking the admin flow.

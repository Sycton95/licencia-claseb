# Autonomous Roadmap v2

## Product purpose

Build a public study app for the Chilean `Licencia Clase B` that optimizes for two constraints above all others:

1. Content accuracy
2. Traceability to formal sources

The product must not claim to replicate the non-public official question bank. It must publish its own reviewed, explainable, source-grounded practice material.

## Locked operating principles

- Public content must come only from `published` questions.
- Hidden admin route policy remains locked: `/admin` is direct URL only and must stay out of public navigation.
- The product remains a single responsive web app.
- AI is assistant-only. It may suggest, flag, cluster, and prepare drafts. It may not publish, overwrite approved questions, or invent sources.
- Any public study-mode or PDF feature stays blocked until content/legal posture is documented in repo docs.

## Current platform baseline

- Frontend: `Vite + React Router`
- Persistence and auth: `Supabase`
- Production writes: `Vercel api/` routes
- Deploy source of truth: `main -> GitHub -> Vercel`
- Current production health target:
  - `schema: v1`
  - `usesServiceRole: true`
- Editorial statuses:
  - `draft`
  - `reviewed`
  - `published`
  - `archived`

## Autonomous execution rules

- Work proceeds milestone by milestone.
- A milestone is not considered closed until:
  - repo changes are committed and pushed
  - `npm run validate:content` passes
  - `npm run build` passes
  - production verification notes are recorded in `docs/progress.md`
- No new milestone starts until the previous one has a status entry in `docs/progress.md`.
- If a milestone introduces local-only infrastructure, the production path must still degrade cleanly.

## UI/UX Track (Delegated)

As of `2026-04-14`, pure public-route UI/UX work is delegated to a separate track.

### Scope (delegated UI/UX track only)

- Public `/`, `/practice`, and `/exam`
- Visual polish, layout refinement, accessibility enhancements
- Keyboard navigation, typography, spacing, and responsive design

### Out of scope for the delegated UI/UX track

- `/admin`
- data-fetching logic
- Supabase clients or API route modifications
- router logic or core application state
- Ollama, content-pipeline, or editorial-workflow features

### Delegated UI/UX progress tracking

- Roadmap: `.builder/plans/ui-ux-roadmap.md`
- Progress log: `.builder/progress.md`

## Release discipline

Normal release gate:

- `npm run validate:content`
- `npm run build`
- `npm run release:check`

Production health checks remain:

- `/api/health`
- hidden `/admin`
- public `/`, `/practice`, `/exam`

## AI editorial policy

### Allowed AI roles

- Suggest new question candidates
- Suggest rewrites for weak or overly framed prompts
- Detect likely editorial issues and review targets
- Detect coverage gaps by chapter/source
- Prepare grounded draft candidates for admin review

### Prohibited AI behaviors

- Auto-publishing content
- Modifying existing published questions without explicit admin action
- Inventing source references, pages, or factual grounding
- Exposing AI suggestion artifacts in public routes

### Grounding policy

Every AI suggestion must carry:

- edition id
- source document id when applicable
- source page or source reference
- rationale
- grounding excerpt
- confidence label
- suggestion type

Any suggestion without source grounding is ineligible for admin approval.

## Milestone sequence

### Milestone 1: Governance and progress safety

Status:

- Implemented in repo

### Milestone 2: Content preparation for AI

Status:

- Implemented for all active chapters in the runtime baseline
- Prepared chunk floor:
  - `chapter-1`: 3
  - `chapter-2`: 3
  - `chapter-3`: 7
  - `chapter-4`: 3
  - `chapter-5`: 3
  - `chapter-6`: 3
  - `chapter-7`: 3
  - `chapter-8`: 3
  - `chapter-9`: 3

### Milestone 3: AI suggestion data model and server routes

Status:

- Implemented in repo and production

### Milestone 4: Admin AI inbox

Status:

- Implemented in repo and production

### Milestone 5: Automated review flags and coverage analysis

Status:

- Core review warnings are implemented
- Milestone `5A` is implemented:
  - duplicate / near-duplicate detection
  - weak-distractor detection
  - inconsistent-instruction checks
  - answer-format mismatch checks

### Milestone 5E: Local LLM suggestion pilot

Status:

- Existing scaffolding implemented:
  - provider abstraction
  - env-gated local Ollama adapter
  - verifier pipeline
  - local beta storage
  - local-only Beta panel in `/admin`
- Current step:
  - sequential local task queue
  - sticky telemetry and live batch log
  - collapsible `/admin` review surfaces
  - clickable related-question references and local-first manual reader
- Production default remains `heuristic`

### Milestone 6: Public UX refinement after editorial scale-up

Status:

- Public UI work continues on the delegated branch
- `/admin` work is not part of this milestone in the delegated track

## Current content baseline

- Published questions:
  - `chapter-1`: 61
  - `chapter-2`: 40
  - `chapter-3`: 20
  - `chapter-4`: 49
  - `chapter-5`: 39
  - `chapter-6`: 40
  - `chapter-7`: 40
  - `chapter-8`: 40
  - `chapter-9`: 40
- Prepared source chunks:
  - `chapter-1`: 3
  - `chapter-2`: 3
  - `chapter-3`: 7
  - `chapter-4`: 3
  - `chapter-5`: 3
  - `chapter-6`: 3
  - `chapter-7`: 3
  - `chapter-8`: 3
  - `chapter-9`: 3
- Runtime chapter taxonomy is aligned to the formal 9-chapter manual structure

## Chapter rollout policy

- Coverage target remains `baseline first`
- Public rollout remains `progressive activate`
- A chapter is ready for public activation only when it has:
  - at least `10` published questions
  - at least `3` prepared source chunks
  - clear source references on published items
  - no unresolved critical editorial warnings

## Reviewed import exclusions

- `4-q047` remains excluded because it cites page `109`, which belongs to `chapter-7`
- `5-q033` remains excluded because it cites page `162`, which belongs to the annex section

## Current next actions

### Main track (content, admin, and release discipline)

1. Keep the runtime catalog aligned to the formal 9-chapter manual structure.
2. Keep Milestone `5A` diagnostics active as the quality gate for imported and locally authored content.
3. Continue Milestone `5E` as the active `/admin` track in this sandbox:
   - local-only
   - opt-in
   - verifier-gated
   - never production-default
   - sequential worker queue, sticky telemetry/logs, and richer review surfaces inside `/admin`
4. Finish the protected-preview gate only where it directly blocks admin release discipline.
5. Keep annexes out of the runtime question bank until a separate annex ingestion policy exists.
6. Run the release gate on each production content update:
   - `npm run validate:content`
   - `npm run build`
   - `npm run release:check`

### Delegated public UI/UX track

- Public `/`, `/practice`, and `/exam` continue on the delegated branch.
- `/admin` is intentionally out of scope for that delegated track.
- Any admin UI needed for Beta local/Ollama work belongs to the main track here.

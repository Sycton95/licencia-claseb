# Autonomous Roadmap v2

## Product purpose

Build a public study app for the Chilean `Licencia Clase B` that optimizes for two constraints above all others:

1. Content accuracy.
2. Traceability to formal sources.

The product must not claim to replicate the non-public official question bank. It must publish its own reviewed, explainable, source-grounded practice material.

## Locked operating principles

- Public content must come only from `published` questions.
- Hidden admin route policy remains locked: `/admin` is direct URL only and must stay out of public navigation.
- The product remains a single responsive web app. Mobile and desktop are both first-class, with denser editorial workflows on desktop where justified.
- AI is assistant-only. It may suggest, flag, cluster, and prepare drafts. It may not publish, overwrite approved questions, or invent sources.
- Public benchmark questionnaires and simulators are allowed only for format and tone comparison, not as normative authority.
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
- No new milestone starts until the previous one has a status entry in `docs/progress.md` with:
  - outcomes
  - remaining risks
  - blocked items
- If a milestone introduces external dependencies or manual infra actions, the code should degrade cleanly and document the missing step rather than breaking the current admin/public flows.

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

- Suggest new question candidates.
- Suggest rewrites for weak or overly framed prompts.
- Detect likely editorial issues and review targets.
- Detect coverage gaps by chapter/source.
- Prepare grounded draft candidates for admin review.

### Prohibited AI behaviors

- Auto-publishing content.
- Modifying existing published questions without an explicit admin action.
- Inventing source references, pages, or factual grounding.
- Using non-whitelisted sources as factual authority.
- Exposing AI suggestion artifacts in public routes.

### Grounding policy

AI suggestion generation must use:

- formal source documents and verified official materials as factual basis
- manually prepared source chunks or extracted notes as grounding inputs
- municipal/public benchmark material only for exam-style format guidance

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

Scope:

- Expand `plan.md` into the main execution roadmap.
- Formalize `docs/progress.md` as the operational log.
- Record autonomy rules, milestone gates, release checks, and AI guardrails.

Exit criteria:

- The roadmap is explicit enough to support longer autonomous work blocks.
- Progress logging is mandatory and unambiguous.

Status:

- Implemented in repo.

### Milestone 2: Content preparation for AI

Scope:

- Add a structured source-preparation layer:
  - source chunks / prepared notes
  - chapter mapping
  - source-to-question traceability helpers
- Keep this layer private to admin and generation flows.

Exit criteria:

- The system can answer, deterministically, which chapter/source a generation pass should use.

Status:

- Initial implementation in repo with prepared chunks for current covered chapters.
- Additional chapter preparation remains pending.

### Milestone 3: AI suggestion data model and server routes

Scope:

- Add persisted suggestion entities in Supabase:
  - `ai_suggestions`
  - `ai_runs`
- Add admin-only API routes for:
  - listing suggestions
  - generating suggestion batches
  - transitioning suggestion status
  - creating draft questions from accepted suggestions
- Keep all suggestion execution server-side in production.

Exit criteria:

- Suggestions can be stored, listed, and reviewed without touching public catalog content automatically.

Status:

- Implemented in repo.
- Requires `supabase/migrations/0003_ai_suggestions.sql` to be applied before production can persist suggestions.

### Milestone 4: Admin AI inbox

Scope:

- Add an admin suggestion inbox with:
  - summary counts
  - type filters
  - chapter filters
  - source filters
  - inline grounded suggestion preview
  - accept/edit/defer/reject actions
- Accepted suggestions become editable drafts, never published content.

Exit criteria:

- Admin can manage AI-generated backlog without leaving `/admin`.

Status:

- Implemented in repo.
- Full production persistence depends on Milestone 3 migration being applied.

### Milestone 5: Automated review flags and coverage analysis

Scope:

- Add rule-based or AI-assisted checks for:
  - missing source references
  - chapter coverage gaps
  - duplicate or near-duplicate prompts
  - weak distractors
  - inconsistent instructions
  - answer-format mismatches
- Surface these as review tasks, not public content.

Exit criteria:

- Admin can use `/admin` primarily as a correction console instead of authoring everything manually.

Status:

- Partially implemented:
  - editorial warnings already exist
  - AI queue now generates flags and coverage-gap tasks
- Duplicate/weak-distractor heuristics remain pending.

### Milestone 6: Public UX refinement after editorial scale-up

Scope:

- Continue public UX cleanup only after AI-assisted editorial flow is stable:
  - cleaner main menu
  - stronger practice review flow
  - better desktop admin ergonomics
  - study-mode prework

Exit criteria:

- Content operations are scalable enough that UX work no longer competes with manual content production.

Status:

- In progress across previous iterations.
- Current work is redirected to the local-only branch `codex/ui-polish-local` for Milestone 6A close-out.
- No further UI deployment should occur until the local visual pass is approved.

## Current next actions

1. Finish Milestone 6A on the local-only branch `codex/ui-polish-local`:
   - refine `/admin` without changing structure
   - verify locally at mobile, tablet, and desktop widths
   - do not deploy intermediate UI passes
2. After local signoff, merge or cherry-pick the approved UI work into `main`.
3. Run the release gate on the approved UI state:
   - `npm run validate:content`
   - `npm run build`
   - `npm run release:check`
4. Deploy once and verify live `/admin` plus `/api/health`.
5. Close Milestone 6A in `docs/progress.md`, then resume Milestone 5 heuristics:
   - duplicate detection
   - weak distractor checks
   - review-task surfacing improvements

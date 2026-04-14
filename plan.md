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

## UI/UX Track (Delegated)

**As of 2026-04-14**, UI/UX milestones have been delegated to a dedicated track:

### Scope (UI/UX Track ONLY)
- Pure UI/UX improvements to public routes (`/`, `/practice`, `/exam`)
- Visual polish, layout refinement, accessibility enhancements
- Keyboard navigation, form interactions, responsive design
- Typography, spacing, color, and component hierarchy

### Strictly Off-Limits (DO NOT TOUCH)
- ❌ Data-fetching logic (hooks like `usePublishedCatalog`)
- ❌ Supabase clients or API route modifications
- ❌ React Router navigation logic
- ❌ Core application state (context, Redux, global hooks)
- ❌ Feature additions (Ollama pilot, chapter imports, content pipeline)
- ❌ Component props or data flow between components

### UI/UX Progress Tracking

- **Roadmap**: `.builder/plans/ui-ux-roadmap.md`
- **Progress Log**: `.builder/progress.md`
- **Operatinal Rules**: See UI/UX roadmap section on state management and boundaries

### Current UI/UX Milestones

**UI/UX-M1**: Design System (✅ Complete)
- Semantic color palette, typography scale, icon library
- CSS variables for theme support (Dark Mode ready)

**UI/UX-M2**: Public Quiz Experience (🔄 In Progress)
- HomePage enhancements, QuizRunner improvements, QuizSummary filtering
- Keyboard navigation and accessibility refinements

**UI/UX-M3**: Admin Interface (❌ Blocked - Lower Priority)
- Deferred per Milestone 6A decision. Will resume after content work stabilizes.

**UI/UX-M4**: Mobile Optimization (⏸️ Pending)
- Touch targets, landscape support, responsive refinements

**UI/UX-M5**: Accessibility Deep-Dive (🔄 In Progress)
- WCAG 2.1 AA compliance, semantic HTML, ARIA roles

### Relationship to Main Roadmap

This plan.md remains the source of truth for:
- Content accuracy and traceability (Milestones 1-5E)
- Chapter rollout and editorial workflow
- Supabase schema and backend operations
- Release discipline and production health

UI/UX milestones are now tracked independently in `.builder/plans/` to maintain clean separation of concerns.

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

- Implemented for the currently covered chapters.
- Current prepared chunks exist only for:
  - `chapter-1`
  - `chapter-3`
- Remaining chapters still need prepared grounding before AI-assisted expansion.

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

- Implemented in repo and production.

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

- Implemented in repo and production.

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
- Milestone 5A has been implemented:
  - duplicate / near-duplicate detection
  - weak-distractor detection
  - inconsistent-instruction checks
  - answer-format mismatch checks

### Milestone 5E: Local LLM suggestion pilot

Scope:

- Add a local-only, opt-in pilot provider for bounded suggestion generation.
- Keep the current heuristic provider as the production default.
- Gate any local model output through deterministic verifier checks before admin review.
- Keep pilot results isolated from the verified suggestion bank and hidden from public routes.

Exit criteria:

- The repo supports a local provider abstraction with:
  - default `heuristic`
  - local `ollama_qwen25_3b` pilot
- Pilot output is:
  - local-only
  - verifier-gated
  - draft-only after explicit admin action
- Production routes and release checks still work with Ollama fully disabled.

Status:

- Scaffolding added in repo:
  - provider abstraction
  - local beta storage
  - verifier pipeline
  - env-gated local Ollama adapter
- Local-only admin Beta panel added:
  - env-gated sidebar section
  - browser-local persistence
  - bounded run controls for `new_question`, `rewrite`, and `mixed`
- The heuristic path remains the only production-active provider.

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

- Milestone 6A close-out accepted and complete.
- UI polishing is paused at the current approved baseline.
- Further roadmap execution returns to content quality and chapter rollout work on `main`.

## Current content baseline

- Published questions currently exist in:
  - `chapter-1`: 28
  - `chapter-2`: 40
  - `chapter-3`: 20
  - `chapter-4`: 49
  - `chapter-5`: 39
  - `chapter-6`: 40
  - `chapter-7`: 40
  - `chapter-8`: 40
  - `chapter-9`: 40
- Prepared source chunks currently exist in:
  - `chapter-1`: 2
  - `chapter-2`: 3
  - `chapter-3`: 7
  - `chapter-4`: 3
  - `chapter-5`: 3
  - `chapter-6`: 3
  - `chapter-7`: 3
  - `chapter-8`: 3
  - `chapter-9`: 3
- Runtime chapter taxonomy is aligned to the formal 9-chapter manual structure.

## Chapter rollout policy

- Coverage target is locked to **baseline first**.
- Public rollout is locked to **progressive activate**.
- A chapter is considered ready for public activation when it reaches all of:
  - at least `10` published questions
  - at least `3` prepared source chunks
  - clear source references on published items
  - no unresolved critical editorial warnings

## Chapter rollout order

The reviewed frontier imports for `chapter-2` and `chapter-4` through `chapter-9` are already merged into the runtime baseline.

Current baseline by chapter:

1. `chapter-1` - `28` published
2. `chapter-2` - `40` published
3. `chapter-3` - `20` published
4. `chapter-4` - `49` published
5. `chapter-5` - `39` published
6. `chapter-6` - `40` published
7. `chapter-7` - `40` published
8. `chapter-8` - `40` published
9. `chapter-9` - `40` published

Excluded reviewed imports:

- `4-q047` remains excluded because it cites page `109`, which belongs to `chapter-7`.
- `5-q033` remains excluded because it cites page `162`, which belongs to the annex section.

## Current next actions

### Main Track (Content & Editorial)

1. Keep the runtime catalog aligned to the formal 9-chapter manual structure.
2. Keep Milestone 5A diagnostics active as the quality gate for imported and locally authored content.
3. Keep Milestone 5E as a local-only pilot track:
   - opt-in
   - verifier-gated
   - never production-default
4. ✅ COMPLETE: Add one more formal source-preparation chunk for `chapter-1` (Visual field limitations - pages 11-12)
5. Keep annexes out of the runtime question bank until a separate annex ingestion policy exists.
6. Run the release gate on each production content update:
   - `npm run validate:content`
   - `npm run build`
   - `npm run release:check`

### UI/UX Track (Parallel)

See `.builder/plans/ui-ux-roadmap.md` for detailed UI/UX milestones.

**Current Focus**:
- Complete UI/UX-M2: Public Quiz Experience (HomePage, QuizRunner, QuizSummary)
- Continue UI/UX-M5: Accessibility Deep-Dive (keyboard nav, ARIA, screen reader testing)
- Prepare for UI/UX-M4: Mobile Optimization (touch targets, landscape support)

**Operational Constraint**: No backend logic, API changes, data-fetching modifications, or feature additions.

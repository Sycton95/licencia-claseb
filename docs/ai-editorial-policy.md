# AI Editorial Policy

## Role of AI in this project

AI is an editorial assistant. It is allowed to:

- suggest new question candidates
- suggest rewrites for weak prompts
- raise review flags
- identify chapter/source coverage gaps

AI is not allowed to:

- publish content
- overwrite approved questions automatically
- invent grounding
- treat public benchmark sites as normative legal authority

## Source policy

### Factual grounding

Factual grounding must come from:

- official manual content
- verified formal sources
- prepared source chunks or extracted notes stored in repo or database

### Format-only references

These may help shape exam-like tone or instruction style, but not facts:

- municipal questionnaires
- public simulators

## Review policy

Every AI suggestion must include:

- source document reference
- source page or equivalent reference
- grounding excerpt or prepared source summary
- rationale
- confidence level
- suggestion type

If any of those are missing, the admin must treat the suggestion as incomplete.

## Publication rule

An AI suggestion cannot become public content directly.

Required path:

1. AI suggestion
2. admin review
3. editable `draft`
4. `reviewed`
5. `published`

## Provider policy

Current implementation:

- `heuristic` provider only

Future model-backed providers are allowed only if they preserve:

- source grounding
- server-side execution
- auditable review flow
- no auto-publish guarantees

## Local pilot evaluation

Milestone `5E` remains local-only and non-production.

Fixed baseline set:

- `pilot-baseline-v1`
- `new_question` chunks:
  - `prep-system-safe-components`
  - `prep-convivencia-vial-space`
- `rewrite` questions:
  - `week1-q01`
  - `import-chapter-2-q001`

Operational rule:

- compare runs only against the fixed set above
- keep reports in local beta storage only
- do not treat beta output as part of the verified suggestion bank
- do not ship pilot results to public routes, admin production routes, or Supabase-backed editorial entities

Local rerun prerequisites:

- `VITE_ENABLE_ADMIN_BETA_PANEL=true`
- `VITE_ENABLE_LOCAL_OLLAMA=true`
- local Ollama reachable at `VITE_OLLAMA_BASE_URL`
- repeated runs should be compared by:
  - attempted count
  - passed count
  - failed count
  - critical vs warning totals
  - top repeated verifier issue codes

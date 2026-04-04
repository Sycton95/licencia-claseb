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

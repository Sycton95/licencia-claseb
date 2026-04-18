# Admin Workflow: Cola AI

## Purpose

`Cola AI` is the main review inbox for heuristic or persisted AI suggestions. It is an editorial review surface inside `/admin`; it is not a public workflow and it does not publish anything by itself.

## Inputs

- Source catalog from `getContentCatalog()`
- AI workspace from `getAiWorkspace()`
- Suggestion diagnostics from `buildSuggestionDiagnosticMap(...)`

Each suggestion includes:

- `id`
- `suggestionType`
- `status`
- `prompt`
- `selectionMode`
- `instruction`
- `suggestedOptions`
- `suggestedCorrectAnswers`
- `sourceDocumentId`
- `sourceReference`
- `groundingExcerpt`
- `rationale`
- `confidence`
- `provider`
- `targetQuestionId` when it is a rewrite

## Confidence badge

The percentage badge in each row is the model-confidence estimate for that draft suggestion.

It is:

- not a verifier pass score
- not an editorial approval signal
- not a publication decision

It is only a quick model-side confidence hint for triage.

## Diagnostics

The queue surfaces editorial diagnostics built from the same review logic used elsewhere in admin.

Current categories include:

- `duplicate_prompt`
- `weak_distractor`
- `instruction_mismatch`
- `answer_format`
- `source_reference`

Duplicate and near-duplicate diagnostics now carry structured related-question references so the reviewer can open the referenced question in a read-only drawer.

## Review actions

Available actions from `Cola AI`:

- `Generar más`
- `Postergar`
- `Rechazar`
- `Cargar en editor`
- `Abrir manual` when a manual PDF reference is available

Behavior:

- `Postergar` moves the suggestion to `deferred`
- `Rechazar` moves the suggestion to `rejected`
- `Cargar en editor` converts the suggestion into a draft editing context

## Outputs

`Cola AI` never publishes directly.

Outputs are:

- suggestion status changes inside the AI workspace
- optional draft handoff into the editor panel
- reviewer inspection of grounding and diagnostics

## Editor handoff

When the operator loads a suggestion into the editor:

- a draft `Question` is built from the suggestion
- the active admin section switches to `Catálogo`
- the editor opens with that draft
- the suggestion can later be reviewed, edited, archived, or published only through the standard editorial actions

## Related-question drawer

When diagnostics reference another question id such as `import-4-q026`, the id is clickable.

The drawer shows:

- question id
- chapter
- status
- prompt
- options and correct answers
- source reference and page
- explanation when available

The drawer is read-only and does not mutate the current draft or queue item.

## Manual action

Where the suggestion carries a manual-backed source reference, `Abrir manual` opens the local-first PDF reader.

Current reader behavior:

- uses the repo manual asset `Libro-ClaseB-2026.pdf`
- opens at the inferred or provided page
- supports next/previous
- supports page jump
- supports zoom controls

If the source cannot be opened as an embeddable PDF, the action degrades cleanly with a non-blocking message.

## Boundaries

`Cola AI` is:

- admin-only
- non-public
- editorial-assistive only

`Cola AI` is not:

- an auto-publisher
- a direct write path to public routes
- a replacement for editorial review

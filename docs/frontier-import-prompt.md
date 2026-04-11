# Frontier Import Prompt

Use this prompt when asking a frontier model to extract question batches from the official manual PDF for this project.

The goal is to produce a raw JSON batch that can be dropped into the repo intake folder, then normalized, validated, and reviewed before any merge into the verified question bank.

## Standard operator workflow

1. Ask the frontier model using the standard prompt below.
2. Save the returned JSON file into `data/imports/`.
3. Keep the raw file unchanged.
4. Run the local importer/validator in a later step.
5. Only after validation may content move toward source preparation or question-bank merge.

## Import review workflow

After dropping a raw batch into `data/imports/`, run:

```bash
npm run review:import -- data/imports/<file>.json
```

The review step writes one per-import log folder into `data/import-reviews/<file-stem>/` with:

- `review-log.json`
- `review-summary.md`
- `accepted-candidates.json`
- `rejected-candidates.json`

Only `accepted-candidates.json` is eligible for later merge preparation.

Import review validates chapter scope against the formal manual numbering:

- `chapter-1`: pages 6-10
- `chapter-2`: pages 11-32
- `chapter-3`: pages 33-36
- `chapter-4`: pages 37-67
- `chapter-5`: pages 68-76
- `chapter-6`: pages 77-108
- `chapter-7`: pages 109-126
- `chapter-8`: pages 127-135
- `chapter-9`: pages 136-148

Annex pages `149-169` are not accepted as normal chapter content.

## Standard output file location

Drop raw files into:

- `data/imports/chapter-3-batch.json`
- `data/imports/chapter-4-batch.json`
- `data/imports/chapter-7-batch-02.json`

One file per chapter. Do not mix chapters in one batch.

## Standard prompt to send to the frontier model

```text
You are generating a structured import batch for a local Chilean driver's license study app.

Your task is to extract and draft multiple-choice questions ONLY from the provided official source PDF:

- Source document: "Libro del Nuevo Conductor Clase B 2026"
- Internal sourceDocumentId: "manual-claseb-2026"

You must produce a single valid UTF-8 JSON object and nothing else.

STRICT RULES

1. Use only the PDF as factual authority.
2. Do not use prior knowledge, web knowledge, or inferred legal rules not present in the PDF text.
3. Do not invent source pages, source references, grounding excerpts, or explanations.
4. Every question must be grounded in explicit text from the PDF.
5. Every question must include a short groundingExcerpt copied or tightly extracted from the relevant PDF passage.
6. The output must be one chapter only.
7. All questions in the batch must belong to the requested chapter.
8. Do not include any markdown, prose, code fences, or commentary outside the JSON.
9. Do not include any field not defined in the schema below.
10. Do not output duplicate or near-duplicate questions.
11. Avoid trivial paraphrases of the same concept.
12. Prefer clear, exam-style wording in Spanish.
13. Prefer "single" questions unless the PDF clearly supports multiple correct statements.
14. For "single", there must be exactly 1 correct answer.
15. For "multiple", there must be at least 2 correct answers and the instruction must match that.
16. Each question should normally have exactly 4 options.
17. Distractors must be plausible, not absurd, and must not repeat each other.
18. Do not include published, reviewed, archived, or internal app status fields.
19. Use zero-based indexes in correctOptionIndexes.
20. If a candidate question is ambiguous, omit it instead of forcing it.

TARGET FOR THIS RUN

Generate a batch for:
- editionId: "edition-2026"
- chapterId: "{{CHAPTER_ID}}"

Required batch size:
- targetQuestionCount: {{TARGET_COUNT}}

If the source material in that chapter is insufficient for the requested count without inventing or repeating, return fewer questions, but keep quality high.

OUTPUT JSON SCHEMA

{
  "batchId": "string",
  "editionId": "edition-2026",
  "chapterId": "chapter-x",
  "sourceDocumentId": "manual-claseb-2026",
  "sourceDocumentTitle": "Libro del Nuevo Conductor Clase B 2026",
  "generatedAt": "ISO-8601 timestamp",
  "generator": {
    "provider": "frontier-ai",
    "model": "your-model-name"
  },
  "questions": [
    {
      "externalId": "string",
      "prompt": "string",
      "selectionMode": "single or multiple",
      "instruction": "string",
      "options": [
        { "text": "string" },
        { "text": "string" },
        { "text": "string" },
        { "text": "string" }
      ],
      "correctOptionIndexes": [0],
      "publicExplanation": "string",
      "sourcePageStart": 0,
      "sourcePageEnd": 0,
      "sourceReference": "string",
      "groundingExcerpt": "string",
      "reviewNotes": "string",
      "tags": ["string", "string"]
    }
  ]
}

FIELD REQUIREMENTS

- batchId:
  - format: "{{CHAPTER_ID}}-batch-YYYY-MM-DD-01"
- externalId:
  - unique within the batch
  - format: "{{CHAPTER_ID}}-q001", "{{CHAPTER_ID}}-q002", etc.
- prompt:
  - formal exam-style Spanish
  - clear and answerable from the cited source text
- instruction:
  - if selectionMode is "single": "Marque una respuesta."
  - if selectionMode is "multiple": "Marque X respuestas."
- options:
  - exactly 4 options unless impossible
  - no duplicate option text
  - no option should reveal the answer through wording alone
- correctOptionIndexes:
  - zero-based
  - consistent with selectionMode
- publicExplanation:
  - concise explanation for learners
  - must reflect the cited source
- sourcePageStart/sourcePageEnd:
  - exact PDF pages where the supporting content appears
- sourceReference:
  - short operator-friendly label like:
    - "Pág. 33, Convivencia Vial"
    - "Págs. 34-35, principio de precaución"
- groundingExcerpt:
  - short excerpt or tightly extracted phrase from the PDF text used as factual support
  - do not fabricate wording
- reviewNotes:
  - short internal note such as:
    - "Pregunta nueva basada en definición explícita del capítulo."
    - "Redacción orientada a evitar ambigüedad."
- tags:
  - 1 to 4 short topic tags
  - lowercase, hyphenated if needed

QUALITY FILTER BEFORE OUTPUT

Before finalizing each question, verify:
- It belongs to the requested chapter.
- It is supported by explicit PDF content.
- It is not a near-duplicate of another question in the same batch.
- The distractors are plausible.
- The explanation matches the correct answer.
- The source pages and reference are exact.
- The wording is not ambiguous.
- The instruction matches the answer format.

OMIT any question that fails any of those checks.

OUTPUT REQUIREMENT

Return only the final JSON object.
No markdown.
No explanation outside JSON.
```

## Required raw batch fields

Accepted top-level fields:

- `batchId`
- `editionId`
- `chapterId`
- `sourceDocumentId`
- `sourceDocumentTitle`
- `generatedAt`
- `generator.provider`
- `generator.model`
- `questions[]`

Required per-question fields:

- `externalId`
- `prompt`
- `selectionMode`
- `instruction`
- `options[].text`
- `correctOptionIndexes`
- `publicExplanation`
- `sourcePageStart`
- `sourcePageEnd`
- `sourceReference`
- `groundingExcerpt`
- `reviewNotes`
- `tags`

## Known importer normalizations

The future importer is expected to normalize low-risk format drift before strict validation.

Known normalizations:

- `chapterId: "3"` -> `chapter-3`
- trim surrounding whitespace in strings
- normalize line breaks
- recover common UTF-8/mojibake where the intended text is recoverable

Important:

- The raw imported JSON must still be preserved unchanged inside `data/imports/`.
- Normalization is a preprocessing step, not a replacement for validation.

## Hard rejection rules

The importer must reject a batch or individual items when any of the following occur:

- mixed chapters in one file
- missing source pages
- missing `groundingExcerpt`
- invalid `correctOptionIndexes`
- `single` questions with anything other than exactly 1 correct answer
- `multiple` questions with fewer than 2 correct answers
- duplicate option text
- questions outside the intended source scope
- clearly duplicated or near-duplicated batch entries
- `sourceDocumentId` different from `manual-claseb-2026`

## Notes from the current chapter 3 batch

The current external batch format is close to the target contract, but it already shows the kinds of drift the importer must handle:

- `chapterId` came as `"3"` instead of `"chapter-3"`
- several text fields contain mojibake
- some entries appear to drift beyond the intended chapter 3 page window and require scope review

This is expected. The importer should normalize low-risk drift, then reject any item that still fails grounding, chapter, or quality checks.

## Per-import logging

Every reviewed file must produce a machine-readable log and a human-readable summary.

Required outputs:

- `data/import-reviews/<file-stem>/review-log.json`
- `data/import-reviews/<file-stem>/review-summary.md`

The review log includes:

- source file path
- review timestamp
- batch metadata
- accepted/rejected counts
- normalization actions
- item-level warnings
- item-level errors
- explicit rejection reasons

## Known limitation

The import reviewer now uses the formal 9-chapter manual structure as the authoritative scope model.

The runtime question-bank chapter taxonomy in the app may still lag behind that structure. Because of that, accepted import candidates are review-valid for manual scope, but they are not automatically ready for direct merge into the current runtime bank without a later chapter-model alignment pass.

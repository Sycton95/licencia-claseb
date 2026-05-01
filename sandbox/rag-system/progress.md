# Sandbox RAG System Progress

**Date:** April 25, 2026
**Status:** Active pivot to annual multimodal foundry

## Current direction

`sandbox/rag-system` is no longer a one-question-per-page experiment. It now acts as the staging ground for the long-term annual foundry that will:

1. parse a yearly manual once,
2. derive multimodal knowledge artifacts once,
3. generate many candidate questions per knowledge unit,
4. verify and dedupe before review,
5. export a review-ready package for `/Admin`.

The production goal remains unchanged:
- no live LLM dependency in production,
- local/AOT generation only,
- human approval in `/Admin` before catalog import,
- enough scale to reach and surpass a 1000+ bank.

## Structural pivot

The older flow was:

1. `build_cache_vision.py`
2. `pdf_qg.py`
3. `build_vectors_vision.py`

That flow was useful for validating VLM OCR and page-level retrieval, but it was too thin:
- page was the only generation unit,
- visual support was incidental,
- there was no verifier or dedupe layer,
- review export was not aligned with the local draft import workflow.

The new foundry keeps the same local-first principle but changes the contracts completely.

## Current staged pipeline

The new modular pipeline in this folder is:

1. `build_manifest.py`
   - creates `manual-build-manifest.json`
   - records source document, chapter map, models, artifact paths, and build identity
2. `extract_pages_vision.py`
   - renders manual pages
   - performs VLM transcription
   - emits `page-artifacts.json`
3. `derive_knowledge_units.py`
   - derives multiple knowledge units per page
   - emits `knowledge-units.json`
4. `build_vectors.py`
   - embeds knowledge-unit support text
   - emits vector cache + mapping
5. `generate_candidates.py`
   - generates multiple candidate questions per unit
   - emits `question-candidates.json`
6. `verify_candidates.py`
   - applies structural, grounding, answer, and visual checks
   - updates verifier metadata and evaluation report
7. `score_and_dedupe.py`
   - clusters duplicate families inside the build
   - keeps the strongest candidate per family
8. `export_review_package.py`
   - emits `review-export.json`
   - preserves sandbox provenance for `/Admin`
9. `run_foundry_build.py`
   - orchestrates the full annual foundry pass

Legacy wrappers remain available:
- `build_cache_vision.py`
- `pdf_qg.py`
- `build_vectors_vision.py`

They now call the new modular stages instead of owning an obsolete format.

## Canonical artifact chain

Each annual build now targets this artifact family:

- `manual-build-manifest.json`
- `page-artifacts.json`
- `knowledge-units.json`
- `knowledge-unit-vectors.npy`
- `knowledge-unit-vector-mapping.json`
- `question-candidates.json`
- `evaluation-report.json`
- `review-export.json`

These artifacts are stored under `sandbox/rag-system/artifacts/<buildId>/`.

## Canonical unit of generation

The canonical unit is now the **knowledge unit**, not the page and not the imported question.

Each knowledge unit carries:
- chapter and page provenance,
- canonical statement,
- grounding spans,
- visual-support requirements,
- entities and numeric values,
- generator hints,
- safety flags,
- build confidence.

This is the basis for scaling toward a 1000+ question bank without exploding duplicates.

## Multimodal support

Visual questions are now modeled explicitly:
- page artifacts carry `visualAssets`
- knowledge units declare `visualSupport`
- candidates declare `generationMode`, `needsVisualAudit`, and `requiredMedia`
- review export preserves visual provenance so `/Admin` can keep using the local draft workflow

Visual candidates are exportable only when the candidate has both:
- textual grounding,
- referenced visual asset ids.

## `/Admin` alignment

This sandbox pivot does not redesign the production catalog schema. Instead it adds the minimum provenance required for the current draft import workflow to absorb generated candidates later.

Near-term additive provenance fields now planned for import metadata:
- `buildId`
- `candidateId`
- `unitIds`
- `generationMode`
- `verifierScore`
- `verifierIssues`
- `requiredMedia`

The intent is that `/Admin` eventually accepts two review lanes:
- external import review
- sandbox-generated review export

Both should converge into the same local draft import path.

## Remaining work after this checkpoint

This sandbox now has the structural pieces, but it still needs empirical tuning:
- stronger schema validation against real build outputs
- better unit derivation quality for long/heterogeneous pages
- richer verifier heuristics against weak distractors and prompt leakage
- duplicate checks against the existing catalog/imported pool, not only within-build families
- a generated-build lane in `/Admin`
- annual diff tooling across manual editions

## Operating assumption

The project direction is now fixed:
- annual local foundry,
- multimodal RAG artifacts,
- generation around knowledge units,
- verifier before human review,
- human approval before production catalog.

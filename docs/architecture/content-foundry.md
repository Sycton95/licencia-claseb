# Content Foundry Architecture

## Purpose

The project is moving from ad hoc question imports and direct AI experiments toward an annual, manual-driven content foundry.

The canonical production lifecycle is:

```text
Manual PDF -> Sandbox Foundry -> Verified Review Export -> Admin Review -> Draft Catalog -> Reviewed/Published Catalog
```

The goal is to build and maintain a scalable 1000+ question bank that can be refreshed each year when the official manual changes, while keeping production safe, auditable, and human-approved.

## Source Of Truth Boundaries

- The official manual PDF and its annual edition metadata are the source for foundry extraction.
- `sandbox/rag-system` is an experimentation area. Production-ready foundry logic must be promoted into production-owned directories and data contracts.
- `/Admin` owns editorial decisions: staging, corrections, approval, rejection, draft import, and revert.
- `Catalogo` is the production question bank. It receives only approved draft imports with provenance.
- Production user flows must not depend on live LLM generation or live VLM parsing.

Official yearly manuals are stored in the production manual library:

```text
data/manual-library/official/<year>/manual-claseb-conaset-<year>.pdf
```

## Annual Build Model

Each manual year gets a separate edition and build identity:

- `editionId`: the manual/content edition, for example `manual-2026`.
- `buildId`: a specific foundry run, for example `manual-foundry-2026-...`.
- Build artifacts are immutable audit outputs. Repairs create derivative builds instead of overwriting the original.
- Cross-year maintenance should compare knowledge units before comparing generated questions.

## Canonical Foundry Artifacts

The sandbox foundry should export only review-ready data to production-facing Admin flows.

Minimum production bridge artifacts:

- Build manifest with build id, manual edition, source PDF, chapter map, model versions, artifact paths, and build metrics.
- Per-chapter review-export JSONL files for lazy loading.
- Review export manifest that lists available chapters, counts, and file paths.
- Candidate records with provenance, verifier evidence, grounding anchors, and media requirements.

Large generated outputs should remain split by chapter. Admin must not load monolithic 100k+ line JSON files.

The production-facing curated copy lives under:

```text
data/foundry-builds/<buildId>/manifest.json
data/foundry-builds/<buildId>/review-export/chapter-*.jsonl
```

Use the promotion command to copy a repaired sandbox build into that production review area:

```powershell
npm run foundry:promote -- <buildId>
```

The promotion step rewrites review-export paths to artifact-relative production paths and keeps raw sandbox internals out of production data.

## Candidate Provenance Contract

Every generated candidate that reaches Admin review should preserve:

- `buildId`
- `candidateId`
- `unitIds`
- `generationMode`: `text`, `visual`, or `mixed`
- `verifierScore`
- `verifierIssues`
- `requiredMedia`
- `groundingAnchors`
- source chapter, page range, support unit, and excerpt

This metadata is review evidence. It does not make a candidate production-ready by itself.

## Catalog Import Policy

Approved generated candidates enter `Catalogo` as `draft`.

Catalog import metadata should preserve:

- foundry provenance
- review disposition
- grounding disposition
- warnings that remain after review
- required visual audit flags
- draft grounding corrections
- attached crop/upload media references

Human review remains mandatory before a question becomes `reviewed` or `published`.

## Legacy System Position

External imports remain useful as a compatibility lane for informal or third-party question banks, but they are no longer the primary growth strategy.

Legacy direct AI generation is deprecated. Future generation should happen ahead of time inside the annual foundry, then pass through verification and Admin review.

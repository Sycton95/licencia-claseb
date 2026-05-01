# PDF Platform

## Purpose

The Admin PDF stack is split into two production-owned layers:

- `pdf.js` in the browser for rendering, text selection, and reviewer interaction
- `PyMuPDF` in the local-only Admin backend worker for heavy PDF operations

This is not a sandbox-only concern. Once PDF logic is validated, it must be promoted into production-owned directories and runtime contracts.

## Canonical Manual Library

Official yearly manuals live under:

```text
data/manual-library/
  official/
    2026/
      manual-claseb-conaset-2026.pdf
    2027/
      manual-claseb-conaset-2027.pdf
```

The current canonical manual id remains:

- `manual-claseb-2026`

The browser URL for that document is resolved through the production manual registry, not through a hardcoded root path.

## Runtime Split

### Browser

`AdminImportPdfWorkspace` is the canonical PDF review surface for:

- Foundry
- Imports
- Catalog manual inspection

It owns:

- page rendering
- browser-safe text extraction for selection
- draft crop selection
- reviewer interaction and fallback display

### Local Admin worker

The local PDF worker owns:

- document health checks
- text-anchor to bbox resolution
- exact highlight lookup
- page image extraction
- PDF-backed image crop generation

The browser reaches it through `/__local/pdf/...` routes when local Admin mode is active.

## Highlight Strategy

The canonical grounding contract is:

- `pageNumber`
- `blockId`
- `excerpt`
- `textAnchor.exact`
- `textAnchor.prefix`
- `textAnchor.suffix`
- optional `bbox`
- `bboxSource`

Resolution order:

1. candidate-provided bbox
2. local PyMuPDF anchor lookup
3. text-layer fallback in the browser
4. page jump plus excerpt panel

## Local Startup

For local Admin with PDF support:

```powershell
npm run dev:admin-local
```

For local Admin with both Ollama beta tooling and PDF support:

```powershell
npm run dev:admin-beta
```

Hosted Admin pages do not need to expose the local PDF worker.

## Local runtime contract

Local Admin startup now writes a runtime state file:

```text
.tmp/admin-local-runtime.json
```

It records:

- `startedAt`
- `mode`
- `vitePort`
- `pdfWorkerPort`
- `adminUrl`
- `pdfWorkerUrl`
- `manualDocumentId`

This file is local-only, is not committed, and is the source of truth for smoke checks and local debugging.

## Local smoke verification

After starting local Admin, verify the runtime with:

```powershell
npm run smoke:admin-local
```

This smoke check:

- reads `.tmp/admin-local-runtime.json`
- verifies `adminUrl`
- verifies `/__local/pdf/health`
- confirms the official manual is reachable by the PDF worker

It does not start services and does not require Ollama.

## Current highlight policy

PDF review follows a text-first policy:

1. browser text-layer match and inline highlight
2. PyMuPDF geometric fallback using `rects[]`
3. page jump plus excerpt/context fallback

The primary editorial experience should be inline text highlight and direct page-text selection. Geometric overlays are fallback behavior only.

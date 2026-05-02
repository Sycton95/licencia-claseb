# Gemini Foundry Plan & Progress

*This document serves as an independent track for Gemini's plan and progress, separate from other coding agents within the repository.*

## Context & Current State
We are currently operating within **Milestone A** of the overall `plan.md` strategy. Our focus is specifically on the `FoundryReviewManager` and its associated environment to ensure it provides an optimal experience for editorial review, shifting the focus away from pipeline debugging to pure editorial judgment.

### Data Reality
- Foundry data originates from `data/foundry-builds/<buildId>/manifest.json` and `review-export/chapter-*.jsonl`.
- The current promoted build is largely textual.
- Meaningful visual/mixed cases or `requiredMedia.assetIds` do not populate the real data yet.
- `groundingAnchors` are technical pipeline data and have been deprioritized in the UI.

## Recent Improvements (Done)
Based on the immediate feedback, the following fixes and enhancements have been implemented:

1. **Spanish-First Product Surface**:
   - The UI copy across `FoundryReviewManager` (Master List, Workspace Grid, Inspector Panel) has been translated to Spanish (e.g., "Builds Maestros", "Espacio de Trabajo", "Cargando candidatos..."). Code logic and variables remain in English.

2. **Data & Telemetry Linkage**:
   - **Trust Score**: Addressed the `* 100` multiplication bug. The score is now correctly treated as a 0-100 percentage.
   - **Iconography Tooltips**: Applied proper native tooltips (`title` attribute) to alert triangles and UI components for better accessibility.
   - **Filters**: Added a "Todos los capítulos" (Chapter) dropdown filter to efficiently manage the large lists of questions in the Workspace Grid. 

3. **PDF Viewer Improvements (`AdminImportPdfWorkspace.tsx`)**:
   - Reduced redundant space when the PDF is opened inline. The right-hand panel ("Contexto", "Texto extraído") is now hidden if draft tools are not allowed, giving the PDF viewer the full designated width.
   - Removed unnecessary labels like 'Visor PDF con selección de texto y referencias visuales.' when in inline verification mode.

4. **Inspector Panel Restructuring**:
   - Removed the 3-tab navigation system (`Content`, `Grounding`, `Metadata`).
   - Replaced it with a single, scrollable vertical flow matching the requested high-value editorial hierarchy:
     1. **Pregunta** (Question, Options, Correct Answer, Public Explanation)
     2. **Fundamentación** (Excerpt, Source Page, PDF button)
     3. **Verificador** (Trust Score, Generation Mode, Heuristic Alerts)
     4. **Apoyo Visual** (Needs Visual Audit tag if present)

## Next Steps & Future UI Proposals (Milestone A & Beyond)

1. **Enhanced Draft Action States**:
   - The "Actions" section (Agregar a lote, Descartar, etc.) needs to be fleshed out structurally at the bottom of the Inspector Panel. Currently, status badges are shown, but the final editorial loop requires robust batching tools.
   
2. **Visual Media Workflows**:
   - Once data starts including true `requiredMedia` and image-based assets, the UI needs to progressively disclose the "Extracted Images" inside the Inspector or PDF viewer without disrupting the text-first review process.

3. **Workspace Grid Pagination/Virtualization**:
   - For extremely large builds (e.g., 5000+ candidates), rendering a single HTML table might cause scroll lag. Introducing simple virtualization (`react-window`) or pagination will be necessary as builds scale.

4. **PDF Grounding Highlights**:
   - Further optimize `PdfViewerPanel` to automatically draw a visible bounding box over the `textAnchor` or `bboxSource` derived from the Inspector's selected candidate.

## Principles to Maintain
- Never silently stage or import content.
- Code in English, Interface in Spanish.
- Editorial workflow > Debugging workflow.

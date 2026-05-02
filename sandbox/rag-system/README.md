# Foundry Sandbox Control Panel

This sandbox now includes a local Python control surface for the annual Foundry pipeline.

Launch it with:

```powershell
cd C:\Users\franc\OneDrive\Documentos\GitHub\licencia-claseb
python sandbox/rag-system/foundry_control_panel.py
```

If `python` is not on `PATH`, launch it with the explicit interpreter you use for the sandbox, for example:

```powershell
C:\path\to\python.exe sandbox/rag-system/foundry_control_panel.py
```

You can also pin the interpreter for future runs with:

```powershell
$env:PYTHON_EXECUTABLE = 'C:\path\to\python.exe'
```

The control panel now resolves Python in this order:

1. `PYTHON_EXECUTABLE`
2. current `sys.executable`
3. `repo/.venv/Scripts/python.exe`
4. `repo/venv/Scripts/python.exe`
5. `C:\Windows\py.exe -3`
6. `C:\Users\franc\AppData\Local\Programs\Python\Python314\python.exe`
7. `python` / `py -3` from `PATH`

## Purpose

The control panel is the local operator surface for:

- full Foundry builds
- targeted reruns of individual pipeline stages
- repair runs against existing sandbox builds
- PDF grounding enrichment
- promotion into `data/foundry-builds/<buildId>/`
- dependency and local-model preflight checks

It is intended to replace ad hoc manual shell invocation for normal local operations.

## Run model

The sandbox now distinguishes:

- `sourceBuildId`
  - stable lineage for one yearly manual hash
- `runId`
  - one concrete generation run under that lineage

Operationally:

- `Full build` creates a **new run**
- it does **not** overwrite an earlier baseline run for the same manual
- repeated runs on the same manual are compared through the local run registry and novelty report
- promotion should target a reviewed run, not happen automatically after generation

Run ids are intentionally short:

- format: `<sourceBuildId>-rNN`
- example:
  - `manual_2026-31abbf7de7c9-r02`

Model names, prompt-template version, and other experiment metadata stay in:

- `manual-build-manifest.json`
- `artifacts/run-registry.json`

This keeps artifact paths shorter on Windows while preserving full run provenance in metadata.

## Telemetry

Long-running sandbox actions now emit structured telemetry in addition to stdout.

Each run can contain:

- `run-events.jsonl`
  - append-only event stream for:
    - `run_started`
    - `stage_started`
    - `stage_completed`
    - `stage_failed`
    - `resource_sample`
    - `run_completed`
- `run-telemetry.json`
  - latest aggregate view for:
    - per-stage timings
    - action history
    - progress counts
    - CPU average/peak
    - memory current/peak
    - optional GPU peak metrics when `nvidia-smi` is available

The control panel consumes the same event stream to show:

- current run id / source lineage
- current stage
- completed stages / total
- elapsed time
- live CPU / memory / GPU snapshots

## What it validates

Before launching a stage, the control panel checks the relevant local prerequisites:

- required Python modules:
  - `tkinter`
  - `fitz`
  - `openai`
  - `numpy`
- required binaries:
  - `node`
  - `npm`
- manual PDF presence:
  - `sandbox/rag-system/manual_2026.pdf`
- Ollama/API availability:
  - `http://localhost:11434`
- required local models from `pipeline_common.DEFAULT_MODELS`

Stage-specific file dependencies are also checked, for example:

- `page-artifacts.json` before `derive-units`
- `knowledge-units.json` before `build-vectors`
- `question-candidates.json` before `verify-candidates`
- `review-export/manifest.json` before `promote-build`

## Actions

The panel exposes these actions:

- `Full build`
- `Repair existing build`
- `Manifest only`
- `Extract pages (vision)`
- `Derive knowledge units`
- `Build vectors`
- `Generate candidates`
- `Verify candidates`
- `Score and dedupe`
- `Export review package`
- `Locate PDF grounding`
- `Promote to Admin`
- `Validate Python syntax`

Recommended workflow after the first baseline run:

1. keep the baseline run unchanged
2. tune generator/verifier behavior
3. run another `Full build` on the same manual lineage
4. inspect:
   - `manual-build-manifest.json`
   - `evaluation-report.json`
   - `review-export/manifest.json`
   - `run-novelty-report.json`
   - `duplicates.json`
5. promote only if the new run is structurally better than the baseline

## Build targeting

The control panel uses `foundry_task_runner.py` to run stages against an explicit build id.

This matters because several sandbox scripts default to rebuilding the current canonical manifest. The task runner removes that ambiguity and makes these operations deterministic for:

- the current canonical build
- repaired runs
- stage reruns against a selected existing sandbox build

## Semantic verifier toggle

The panel includes a toggle for:

```text
RAG_ENABLE_SEMANTIC_VERIFIER=1
```

This is applied only to the `Verify candidates` action.

## Related files

- `sandbox/rag-system/foundry_control_panel.py`
- `sandbox/rag-system/foundry_task_runner.py`
- `sandbox/rag-system/run_foundry_build.py`
- `sandbox/rag-system/repair_foundry_artifacts.py`
- `scripts/promote-foundry-build.mjs`

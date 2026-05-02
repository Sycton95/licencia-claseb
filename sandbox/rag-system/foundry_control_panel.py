from __future__ import annotations

import importlib.util
import json
import os
import queue
import shutil
import subprocess
import threading
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
import tkinter as tk
from tkinter import messagebox, ttk
from tkinter.scrolledtext import ScrolledText

from lib.pipeline_common import ARTIFACTS_DIR, DEFAULT_MANUAL_PATH, DEFAULT_MODELS, ROOT_DIR, build_id_for_manual, get_build_paths, load_json, load_run_registry
from lib.python_runtime import PythonRuntime, resolve_python_runtime

REPO_ROOT = ROOT_DIR.parent.parent
PRODUCTION_FOUNDRY_DIR = REPO_ROOT / 'data' / 'foundry-builds'
OLLAMA_TAGS_URL = 'http://localhost:11434/api/tags'
OLLAMA_MODELS_URL = 'http://localhost:11434/v1/models'
EVENT_PREFIX = 'FOUNDRY_EVENT\t'


@dataclass(frozen=True)
class CheckResult:
    ok: bool
    summary: str
    detail: str = ''


@dataclass(frozen=True)
class ActionDefinition:
    key: str
    label: str
    description: str


class FoundryControlApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title('Foundry Sandbox Control Panel')
        self.root.geometry('1380x920')
        self.root.minsize(1200, 760)

        self.log_queue: queue.Queue[str] = queue.Queue()
        self.event_queue: queue.Queue[dict] = queue.Queue()
        self.running_process: subprocess.Popen[str] | None = None
        self.running_thread: threading.Thread | None = None

        self.default_source_build_id = build_id_for_manual(2026, DEFAULT_MANUAL_PATH)
        self.python_runtime = resolve_python_runtime(REPO_ROOT)
        self.status_items: list[tuple[str, CheckResult]] = []

        self.selected_build_var = tk.StringVar(value='')
        self.selected_source_var = tk.StringVar(value=self.default_source_build_id)
        self.repaired_build_var = tk.StringVar()
        self.semantic_verifier_var = tk.BooleanVar(value=False)
        self.action_var = tk.StringVar(value='full_build')
        self.selected_run_summary = tk.StringVar(value='No existing run selected. Full build does not need one.')
        self.live_status_var = tk.StringVar(value='Idle')
        self.live_action_var = tk.StringVar(value='No active action')
        self.live_run_var = tk.StringVar(value='Run: n/a')
        self.live_stage_var = tk.StringVar(value='Stage: n/a')
        self.live_progress_var = tk.StringVar(value='Progress: n/a')
        self.live_elapsed_var = tk.StringVar(value='Elapsed: 00:00')
        self.live_cpu_var = tk.StringVar(value='CPU: n/a')
        self.live_memory_var = tk.StringVar(value='Memory: n/a')
        self.live_gpu_var = tk.StringVar(value='GPU: n/a')
        self.live_artifact_var = tk.StringVar(value='Telemetry: n/a')
        self._live_started_monotonic: float | None = None
        self._live_elapsed_ms = 0
        self._resource_samples = 0
        self._cpu_avg = 0.0
        self._cpu_peak = 0.0
        self._memory_peak = 0.0
        self._gpu_peak: int | None = None
        self._gpu_memory_peak: int | None = None

        self._build_ui()
        self.refresh_build_lists()
        self.refresh_status()
        self.root.after(150, self._poll_log_queue)
        self.root.after(500, self._tick_live_elapsed)
        self.root.protocol('WM_DELETE_WINDOW', self._on_close)

    def _build_ui(self) -> None:
        self.root.columnconfigure(0, weight=0)
        self.root.columnconfigure(1, weight=1)
        self.root.rowconfigure(0, weight=1)

        sidebar = ttk.Frame(self.root, padding=12)
        sidebar.grid(row=0, column=0, sticky='nsw')
        sidebar.columnconfigure(0, weight=1)
        sidebar.rowconfigure(2, weight=1)

        content = ttk.Frame(self.root, padding=(0, 12, 12, 12))
        content.grid(row=0, column=1, sticky='nsew')
        content.columnconfigure(0, weight=1)
        content.rowconfigure(2, weight=1)

        status_frame = ttk.LabelFrame(sidebar, text='Runtime status', padding=10)
        status_frame.grid(row=0, column=0, sticky='ew')
        status_frame.columnconfigure(0, weight=1)
        self.status_tree = ttk.Treeview(status_frame, columns=('state', 'detail'), show='headings', height=9)
        self.status_tree.heading('state', text='State')
        self.status_tree.heading('detail', text='Detail')
        self.status_tree.column('state', width=90, anchor='center')
        self.status_tree.column('detail', width=320, anchor='w')
        self.status_tree.grid(row=0, column=0, sticky='ew')
        ttk.Button(status_frame, text='Refresh status', command=self.refresh_status).grid(row=1, column=0, sticky='ew', pady=(8, 0))

        build_frame = ttk.LabelFrame(sidebar, text='Run context', padding=10)
        build_frame.grid(row=1, column=0, sticky='ew', pady=(12, 0))
        build_frame.columnconfigure(0, weight=1)
        ttk.Label(build_frame, text='Source lineage for new full builds').grid(row=0, column=0, sticky='w')
        ttk.Label(build_frame, textvariable=self.selected_source_var, wraplength=360, justify='left').grid(row=1, column=0, sticky='ew', pady=(4, 6))
        ttk.Label(build_frame, text='Existing sandbox run (used for rerun, repair, promote)').grid(row=2, column=0, sticky='w')
        self.build_combo = ttk.Combobox(build_frame, textvariable=self.selected_build_var, state='readonly', width=42)
        self.build_combo.grid(row=3, column=0, sticky='ew', pady=(4, 6))
        self.build_combo.bind('<<ComboboxSelected>>', lambda _event: self._update_selected_run_summary(self._discover_sandbox_runs()))
        ttk.Label(build_frame, textvariable=self.selected_run_summary, wraplength=360, justify='left').grid(row=4, column=0, sticky='ew')

        repair_row = ttk.Frame(build_frame)
        repair_row.grid(row=5, column=0, sticky='ew', pady=(8, 6))
        repair_row.columnconfigure(1, weight=1)
        ttk.Label(repair_row, text='Repair output run id').grid(row=0, column=0, sticky='w', padx=(0, 8))
        ttk.Entry(repair_row, textvariable=self.repaired_build_var).grid(row=0, column=1, sticky='ew')

        ttk.Checkbutton(
            build_frame,
            text='Enable semantic verifier for verify stage',
            variable=self.semantic_verifier_var,
        ).grid(row=6, column=0, sticky='w')
        ttk.Button(build_frame, text='Refresh run lists', command=self.refresh_build_lists).grid(row=7, column=0, sticky='ew', pady=(8, 0))

        action_frame = ttk.LabelFrame(sidebar, text='Actions', padding=10)
        action_frame.grid(row=2, column=0, sticky='nsew', pady=(12, 0))
        action_frame.columnconfigure(0, weight=1)
        action_frame.rowconfigure(1, weight=1)

        action_list_frame = ttk.Frame(action_frame)
        action_list_frame.grid(row=0, column=0, sticky='nsew')
        action_list_frame.columnconfigure(0, weight=1)
        action_frame.rowconfigure(0, weight=1)

        self.action_canvas = tk.Canvas(action_list_frame, height=220, highlightthickness=0)
        self.action_canvas.grid(row=0, column=0, sticky='nsew')
        action_scrollbar = ttk.Scrollbar(action_list_frame, orient='vertical', command=self.action_canvas.yview)
        action_scrollbar.grid(row=0, column=1, sticky='ns')
        self.action_canvas.configure(yscrollcommand=action_scrollbar.set)

        self.action_inner = ttk.Frame(self.action_canvas)
        self.action_window = self.action_canvas.create_window((0, 0), window=self.action_inner, anchor='nw')
        self.action_inner.bind('<Configure>', self._sync_action_scrollregion)
        self.action_canvas.bind('<Configure>', self._resize_action_window)

        for row_index, action in enumerate(self._actions()):
            ttk.Radiobutton(
                self.action_inner,
                text=action.label,
                value=action.key,
                variable=self.action_var,
                command=self._update_action_help,
            ).grid(row=row_index, column=0, sticky='w', pady=2)

        self.action_help = tk.StringVar()
        ttk.Label(action_frame, textvariable=self.action_help, wraplength=360, justify='left').grid(
            row=1, column=0, sticky='ew', pady=(10, 0)
        )
        action_buttons = ttk.Frame(action_frame)
        action_buttons.grid(row=2, column=0, sticky='ew', pady=(12, 0))
        action_buttons.columnconfigure(0, weight=1)
        action_buttons.columnconfigure(1, weight=1)
        ttk.Button(action_buttons, text='Run action', command=self.run_selected_action).grid(
            row=0, column=0, sticky='ew', padx=(0, 4)
        )
        ttk.Button(action_buttons, text='Stop action', command=self.stop_running_action).grid(
            row=0, column=1, sticky='ew', padx=(4, 0)
        )
        self._update_action_help()

        top_row = ttk.Frame(content)
        top_row.grid(row=0, column=0, sticky='ew')
        top_row.columnconfigure(0, weight=1)
        top_row.columnconfigure(1, weight=1)

        artifacts_frame = ttk.LabelFrame(top_row, text='Sandbox runs by source build', padding=10)
        artifacts_frame.grid(row=0, column=0, sticky='nsew', padx=(0, 6))
        artifacts_frame.columnconfigure(0, weight=1)
        artifacts_frame.rowconfigure(0, weight=1)
        self.run_tree = ttk.Treeview(
            artifacts_frame,
            columns=('status', 'created', 'generator', 'novelty'),
            show='tree headings',
            height=10,
        )
        self.run_tree.heading('#0', text='Source / Run')
        self.run_tree.heading('status', text='Status')
        self.run_tree.heading('created', text='Created')
        self.run_tree.heading('generator', text='Generator')
        self.run_tree.heading('novelty', text='Novelty')
        self.run_tree.column('#0', width=320, anchor='w')
        self.run_tree.column('status', width=90, anchor='center')
        self.run_tree.column('created', width=150, anchor='w')
        self.run_tree.column('generator', width=150, anchor='w')
        self.run_tree.column('novelty', width=90, anchor='center')
        self.run_tree.grid(row=0, column=0, sticky='nsew')
        self.run_tree.bind('<<TreeviewSelect>>', self._apply_run_tree_selection)

        promoted_frame = ttk.LabelFrame(top_row, text='Promoted builds', padding=10)
        promoted_frame.grid(row=0, column=1, sticky='nsew', padx=(6, 0))
        promoted_frame.columnconfigure(0, weight=1)
        promoted_frame.rowconfigure(0, weight=1)
        self.promoted_list = tk.Listbox(promoted_frame, height=10)
        self.promoted_list.grid(row=0, column=0, sticky='nsew')

        progress_frame = ttk.LabelFrame(content, text='Live run telemetry', padding=10)
        progress_frame.grid(row=1, column=0, sticky='ew', pady=(12, 0))
        for column in range(3):
            progress_frame.columnconfigure(column, weight=1)
        ttk.Label(progress_frame, textvariable=self.live_status_var, anchor='w').grid(row=0, column=0, sticky='ew', padx=(0, 12))
        ttk.Label(progress_frame, textvariable=self.live_action_var, anchor='w').grid(row=0, column=1, sticky='ew', padx=12)
        ttk.Label(progress_frame, textvariable=self.live_elapsed_var, anchor='w').grid(row=0, column=2, sticky='ew', padx=(12, 0))
        ttk.Label(progress_frame, textvariable=self.live_run_var, anchor='w').grid(row=1, column=0, sticky='ew', padx=(0, 12), pady=(8, 0))
        ttk.Label(progress_frame, textvariable=self.live_stage_var, anchor='w').grid(row=1, column=1, sticky='ew', padx=12, pady=(8, 0))
        ttk.Label(progress_frame, textvariable=self.live_progress_var, anchor='w').grid(row=1, column=2, sticky='ew', padx=(12, 0), pady=(8, 0))
        ttk.Label(progress_frame, textvariable=self.live_cpu_var, anchor='w').grid(row=2, column=0, sticky='ew', padx=(0, 12), pady=(8, 0))
        ttk.Label(progress_frame, textvariable=self.live_memory_var, anchor='w').grid(row=2, column=1, sticky='ew', padx=12, pady=(8, 0))
        ttk.Label(progress_frame, textvariable=self.live_gpu_var, anchor='w').grid(row=2, column=2, sticky='ew', padx=(12, 0), pady=(8, 0))
        ttk.Label(progress_frame, textvariable=self.live_artifact_var, anchor='w').grid(row=3, column=0, columnspan=3, sticky='ew', pady=(8, 0))

        log_frame = ttk.LabelFrame(content, text='Execution log', padding=10)
        log_frame.grid(row=2, column=0, sticky='nsew', pady=(12, 0))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        self.log_text = ScrolledText(log_frame, wrap='word', font=('Consolas', 10))
        self.log_text.grid(row=0, column=0, sticky='nsew')
        self.log_text.configure(state='disabled')

    def _sync_action_scrollregion(self, _event: object) -> None:
        self.action_canvas.configure(scrollregion=self.action_canvas.bbox('all'))

    def _resize_action_window(self, event: object) -> None:
        self.action_canvas.itemconfigure(self.action_window, width=event.width)

    def _actions(self) -> list[ActionDefinition]:
        return [
            ActionDefinition('full_build', 'Full build', 'Creates a brand new run under the source lineage shown above. It does not use the selected existing run.'),
            ActionDefinition('repair_build', 'Repair existing build', 'Repairs page artifacts for an existing sandbox build and rebuilds derived outputs.'),
            ActionDefinition('build_manifest', 'Manifest only', 'Rebuilds the current manual manifest and refreshes the canonical build id.'),
            ActionDefinition('extract_pages', 'Extract pages (vision)', 'Renders manual pages and runs the local VLM transcription stage.'),
            ActionDefinition('derive_units', 'Derive knowledge units', 'Rebuilds knowledge units from page artifacts.'),
            ActionDefinition('build_vectors', 'Build vectors', 'Embeds knowledge units with the local embedding model.'),
            ActionDefinition('generate_candidates', 'Generate candidates', 'Generates question candidates from knowledge units.'),
            ActionDefinition('verify_candidates', 'Verify candidates', 'Runs deterministic verification and optional semantic verification.'),
            ActionDefinition('score_and_dedupe', 'Score and dedupe', 'Applies within-build duplicate clustering.'),
            ActionDefinition('export_review', 'Export review package', 'Writes review-export JSON and per-chapter JSONL.'),
            ActionDefinition('locate_grounding', 'Locate PDF grounding', 'Adds PyMuPDF bbox grounding to existing units.'),
            ActionDefinition('promote_build', 'Promote to Admin', 'Copies the selected sandbox run into data/foundry-builds after structural review.'),
            ActionDefinition('validate_python', 'Validate Python syntax', 'Runs py_compile across the sandbox pipeline files.'),
        ]

    def _update_action_help(self) -> None:
        action = next((item for item in self._actions() if item.key == self.action_var.get()), None)
        self.action_help.set(action.description if action else '')

    def append_log(self, message: str) -> None:
        self.log_text.configure(state='normal')
        self.log_text.insert('end', message)
        if not message.endswith('\n'):
            self.log_text.insert('end', '\n')
        self.log_text.see('end')
        self.log_text.configure(state='disabled')

    def _poll_log_queue(self) -> None:
        try:
            while True:
                self.append_log(self.log_queue.get_nowait())
        except queue.Empty:
            pass
        try:
            while True:
                self._handle_runner_event(self.event_queue.get_nowait())
        except queue.Empty:
            pass
        self.root.after(150, self._poll_log_queue)

    def _tick_live_elapsed(self) -> None:
        if self._live_started_monotonic is not None and self.running_process is not None:
            elapsed_ms = int((time.monotonic() - self._live_started_monotonic) * 1000)
            self._live_elapsed_ms = max(self._live_elapsed_ms, elapsed_ms)
            self.live_elapsed_var.set(f'Elapsed: {self._format_duration_ms(self._live_elapsed_ms)}')
        self.root.after(500, self._tick_live_elapsed)

    def refresh_build_lists(self) -> None:
        sandbox_runs = self._discover_sandbox_runs()
        promoted_builds = self._discover_promoted_builds()

        combo_values = [item['runId'] for item in sandbox_runs] or []
        self.build_combo['values'] = combo_values
        if combo_values:
            if self.selected_build_var.get() not in combo_values:
                self.selected_build_var.set(combo_values[0])
        else:
            self.selected_build_var.set('')

        self.run_tree.delete(*self.run_tree.get_children())
        grouped: dict[str, list[dict]] = {}
        for run in sandbox_runs:
            grouped.setdefault(run['sourceBuildId'], []).append(run)
        for source_build_id, runs in grouped.items():
            parent = self.run_tree.insert('', 'end', iid=f'source::{source_build_id}', text=source_build_id, values=('', '', '', ''))
            for run in runs:
                novelty_label = f"{round(float(run.get('noveltyRate', 0)) * 100)}%" if run.get('noveltyRate') is not None else 'n/a'
                self.run_tree.insert(
                    parent,
                    'end',
                    iid=f"run::{run['runId']}",
                    text=run['runId'],
                    values=(
                        run.get('status', 'unknown'),
                        str(run.get('createdAt', ''))[:19],
                        run.get('generatorModel') or run.get('models', {}).get('generatorModel') or '',
                        novelty_label,
                    ),
                )
            self.run_tree.item(parent, open=True)

        self.promoted_list.delete(0, 'end')
        for item in promoted_builds:
            self.promoted_list.insert('end', item)
        self._update_selected_run_summary(sandbox_runs)

    def _discover_sandbox_runs(self) -> list[dict]:
        registry = load_run_registry()
        merged: dict[str, dict] = {
            entry['runId']: entry
            for entry in registry.get('runs', [])
            if entry.get('runId')
        }
        if ARTIFACTS_DIR.exists():
            for child in sorted(ARTIFACTS_DIR.iterdir(), reverse=True):
                manifest_path = child / 'manual-build-manifest.json'
                if not child.is_dir() or not manifest_path.exists():
                    continue
                manifest = load_json(manifest_path, {}) or {}
                run_id = manifest.get('runId', child.name)
                discovered = {
                    'runId': run_id,
                    'buildId': manifest.get('buildId', child.name),
                    'sourceBuildId': manifest.get('sourceBuildId', manifest.get('buildId', child.name)),
                    'createdAt': manifest.get('createdAt', ''),
                    'status': manifest.get('status', 'unknown'),
                    'models': manifest.get('models', {}),
                    'generatorModel': manifest.get('models', {}).get('generatorModel'),
                }
                merged[run_id] = {**discovered, **merged.get(run_id, {})}
        runs = list(merged.values())
        runs.sort(key=lambda item: str(item.get('createdAt', '')), reverse=True)
        return runs

    def _discover_promoted_builds(self) -> list[str]:
        if not PRODUCTION_FOUNDRY_DIR.exists():
            return []
        builds = []
        for child in sorted(PRODUCTION_FOUNDRY_DIR.iterdir()):
            manifest_path = child / 'manifest.json'
            if child.is_dir() and manifest_path.exists():
                builds.append(child.name)
        return builds

    def _apply_run_tree_selection(self, _event: object) -> None:
        selection = self.run_tree.selection()
        if not selection:
            return
        node_id = selection[0]
        if not node_id.startswith('run::'):
            return
        value = node_id.replace('run::', '', 1)
        self.selected_build_var.set(value)
        self._update_selected_run_summary(self._discover_sandbox_runs())

    def _update_selected_run_summary(self, sandbox_runs: list[dict]) -> None:
        selected_run_id = self.selected_build_var.get().strip()
        selected_run = next((run for run in sandbox_runs if run.get('runId') == selected_run_id), None)
        if not selected_run:
            self.selected_source_var.set(self.default_source_build_id)
            self.selected_run_summary.set('No existing run selected. Full build does not need one.')
            return
        self.selected_source_var.set(selected_run.get('sourceBuildId', self.default_source_build_id))
        self.selected_run_summary.set(
            f"Source: {selected_run.get('sourceBuildId', 'n/a')} | "
            f"Status: {selected_run.get('status', 'unknown')} | "
            f"Generator: {selected_run.get('generatorModel') or selected_run.get('models', {}).get('generatorModel', 'n/a')} | "
            f"Novelty: {round(float(selected_run.get('noveltyRate', 0)) * 100) if selected_run.get('noveltyRate') is not None else 'n/a'}%"
        )

    def refresh_status(self) -> None:
        results = self._collect_status()
        self.status_tree.delete(*self.status_tree.get_children())
        for name, result in results:
            state_label = 'OK' if result.ok else 'BLOCKED'
            detail = result.summary if not result.detail else f"{result.summary} | {result.detail}"
            self.status_tree.insert('', 'end', values=(state_label, f'{name}: {detail}'))
        self.status_items = results

    def _collect_status(self) -> list[tuple[str, CheckResult]]:
        selected_build = self.selected_build_var.get().strip()
        build_paths = get_build_paths(selected_build) if selected_build else None
        ollama = self._check_ollama()
        return [
            ('Python', self._check_python_runtime()),
            ('Tkinter', self._check_python_module('tkinter')),
            ('PyMuPDF', self._check_python_module('fitz')),
            ('OpenAI SDK', self._check_python_module('openai')),
            ('NumPy', self._check_python_module('numpy')),
            ('Node.js', self._check_binary('node')),
            ('npm', self._check_binary('npm')),
            ('Manual PDF', CheckResult(DEFAULT_MANUAL_PATH.exists(), str(DEFAULT_MANUAL_PATH))),
            ('Ollama API', ollama),
            (
                'Current run manifest',
                CheckResult(
                    bool(build_paths and build_paths.manifest_path.exists()),
                    selected_build or 'No run selected',
                    str(build_paths.manifest_path) if build_paths else '',
                ),
            ),
        ]

    def _check_python_module(self, module_name: str) -> CheckResult:
        spec = importlib.util.find_spec(module_name)
        return CheckResult(spec is not None, module_name)

    def _check_python_runtime(self) -> CheckResult:
        self.python_runtime = resolve_python_runtime(REPO_ROOT)
        if not self.python_runtime:
            return CheckResult(False, 'No Python runtime resolved', 'Set PYTHON_EXECUTABLE or add Python to a known location.')
        command = " ".join([self.python_runtime.command, *self.python_runtime.args]).strip()
        return CheckResult(True, command, self.python_runtime.source)

    def _check_binary(self, name: str) -> CheckResult:
        resolved = shutil.which(name)
        return CheckResult(bool(resolved), resolved or f'{name} not found')

    def _check_ollama(self) -> CheckResult:
        try:
            with urllib.request.urlopen(OLLAMA_TAGS_URL, timeout=2.5) as response:
                payload = json.loads(response.read().decode('utf-8'))
            models = [item.get('name', '') for item in payload.get('models', []) if item.get('name')]
        except Exception:
            try:
                with urllib.request.urlopen(OLLAMA_MODELS_URL, timeout=2.5) as response:
                    payload = json.loads(response.read().decode('utf-8'))
                models = [item.get('id', '') for item in payload.get('data', []) if item.get('id')]
            except Exception as error:  # noqa: BLE001
                return CheckResult(False, 'Ollama unavailable', type(error).__name__)

        normalized_models = self._normalize_ollama_model_names(models)
        required_models = {
            DEFAULT_MODELS['visionModel'],
            DEFAULT_MODELS['embedModel'],
            DEFAULT_MODELS['generatorModel'],
            DEFAULT_MODELS['verifierModel'],
        }
        missing = sorted(
            model for model in required_models if self._normalize_ollama_model_name(model) not in normalized_models
        )
        summary = ', '.join(sorted(required_models))
        if missing:
            return CheckResult(False, f'Missing models: {", ".join(missing)}', summary)
        return CheckResult(True, 'All required models available', summary)

    def _normalize_ollama_model_name(self, model_name: str) -> str:
        normalized = (model_name or '').strip().lower()
        if normalized.endswith(':latest'):
            normalized = normalized[:-7]
        return normalized

    def _normalize_ollama_model_names(self, model_names: list[str] | set[str]) -> set[str]:
        return {
            normalized
            for normalized in (self._normalize_ollama_model_name(name) for name in model_names)
            if normalized
        }

    def run_selected_action(self) -> None:
        if self.running_process is not None:
            messagebox.showwarning('Action running', 'Wait for the current action to finish or stop it first.')
            return

        action_key = self.action_var.get()
        check_failures = self._preflight_for_action(action_key)
        if check_failures:
            joined = '\n'.join(f'- {item}' for item in check_failures)
            messagebox.showerror('Preflight failed', joined)
            return

        command, cwd, env = self._build_command(action_key)
        if not command:
            return

        self._reset_live_status(action_key)
        self.append_log(f'$ {" ".join(command)}')
        self.running_thread = threading.Thread(
            target=self._run_process,
            args=(command, cwd, env),
            daemon=True,
        )
        self.running_thread.start()

    def stop_running_action(self) -> None:
        if self.running_process is None:
            return
        self.running_process.terminate()
        self.append_log('Requested process termination.')

    def _run_process(self, command: list[str], cwd: Path, env: dict[str, str]) -> None:
        try:
            self.running_process = subprocess.Popen(
                command,
                cwd=str(cwd),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            assert self.running_process.stdout is not None
            for line in self.running_process.stdout:
                stripped = line.strip()
                if stripped.startswith(EVENT_PREFIX):
                    try:
                        self.event_queue.put(json.loads(stripped[len(EVENT_PREFIX) :]))
                    except json.JSONDecodeError:
                        self.log_queue.put(line)
                    continue
                self.log_queue.put(line)
            return_code = self.running_process.wait()
            self.log_queue.put(f'Process finished with exit code {return_code}.\n')
        except Exception as error:  # noqa: BLE001
            self.log_queue.put(f'Failed to start process: {type(error).__name__}: {error}\n')
        finally:
            self.running_process = None
            self.running_thread = None
            self.root.after(0, self.refresh_build_lists)
            self.root.after(0, self.refresh_status)

    def _preflight_for_action(self, action_key: str) -> list[str]:
        selected_build = self.selected_build_var.get().strip()
        if not selected_build and action_key not in {'full_build', 'build_manifest'}:
            return ['Select a sandbox run first.']
        build_paths = get_build_paths(selected_build) if selected_build else None
        failures: list[str] = []

        if action_key in {'full_build', 'extract_pages'}:
            failures.extend(self._require_python_runtime())
            failures.extend(self._require_manual_and_models())
            failures.extend(self._require_modules('fitz', 'openai'))
        elif action_key == 'derive_units':
            failures.extend(self._require_python_runtime())
            failures.extend(self._require_file(build_paths.page_artifacts_path, 'page-artifacts.json is required'))
        elif action_key == 'build_vectors':
            failures.extend(self._require_python_runtime())
            failures.extend(self._require_modules('numpy', 'openai'))
            failures.extend(self._require_file(build_paths.knowledge_units_path, 'knowledge-units.json is required'))
            failures.extend(self._require_ollama_models(DEFAULT_MODELS['embedModel']))
        elif action_key == 'generate_candidates':
            failures.extend(self._require_python_runtime())
            failures.extend(self._require_modules('openai'))
            failures.extend(self._require_file(build_paths.knowledge_units_path, 'knowledge-units.json is required'))
            failures.extend(self._require_ollama_models(DEFAULT_MODELS['generatorModel']))
        elif action_key == 'verify_candidates':
            failures.extend(self._require_python_runtime())
            failures.extend(self._require_file(build_paths.question_candidates_path, 'question-candidates.json is required'))
            failures.extend(self._require_file(build_paths.knowledge_units_path, 'knowledge-units.json is required'))
            failures.extend(self._require_file(build_paths.page_artifacts_path, 'page-artifacts.json is required'))
            if self.semantic_verifier_var.get():
                failures.extend(self._require_modules('openai'))
                failures.extend(self._require_ollama_models(DEFAULT_MODELS['verifierModel']))
        elif action_key == 'score_and_dedupe':
            failures.extend(self._require_python_runtime())
            failures.extend(self._require_file(build_paths.question_candidates_path, 'question-candidates.json is required'))
        elif action_key == 'export_review':
            failures.extend(self._require_python_runtime())
            failures.extend(self._require_file(build_paths.question_candidates_path, 'question-candidates.json is required'))
        elif action_key == 'locate_grounding':
            failures.extend(self._require_python_runtime())
            failures.extend(self._require_modules('fitz'))
            failures.extend(self._require_file(build_paths.knowledge_units_path, 'knowledge-units.json is required'))
            manifest = load_json(build_paths.manifest_path, {}) or {}
            pdf_path = Path(manifest.get('sourceDocument', {}).get('pdfPath') or DEFAULT_MANUAL_PATH)
            failures.extend(self._require_file(pdf_path, 'source PDF is required'))
        elif action_key == 'repair_build':
            failures.extend(self._require_python_runtime())
            failures.extend(self._require_file(build_paths.manifest_path, 'Selected build manifest is required'))
            failures.extend(self._require_file(build_paths.page_artifacts_path, 'Selected build page-artifacts.json is required'))
        elif action_key == 'promote_build':
            failures.extend(self._require_binary('node'))
            failures.extend(self._require_file(build_paths.review_export_dir / 'manifest.json', 'Sandbox review-export manifest is required before promote'))
        elif action_key == 'validate_python':
            failures.extend(self._require_python_runtime())
        elif action_key == 'build_manifest':
            failures.extend(self._require_python_runtime())
            failures.extend(self._require_file(DEFAULT_MANUAL_PATH, 'Manual PDF is required'))

        return failures

    def _require_modules(self, *modules: str) -> list[str]:
        failures = []
        for module_name in modules:
            if importlib.util.find_spec(module_name) is None:
                failures.append(f'Python module missing: {module_name}')
        return failures

    def _require_binary(self, name: str) -> list[str]:
        return [] if shutil.which(name) else [f'Required binary not found: {name}']

    def _require_python_runtime(self) -> list[str]:
        self.python_runtime = resolve_python_runtime(REPO_ROOT)
        if self.python_runtime:
            return []
        return ['Python runtime not resolved. Set PYTHON_EXECUTABLE or install Python in a known location.']

    def _require_file(self, path: Path, message: str) -> list[str]:
        return [] if path.exists() else [f'{message}: {path}']

    def _require_manual_and_models(self) -> list[str]:
        failures = self._require_file(DEFAULT_MANUAL_PATH, 'Manual PDF is required')
        failures.extend(self._require_ollama_models(DEFAULT_MODELS['visionModel'], DEFAULT_MODELS['generatorModel'], DEFAULT_MODELS['embedModel'], DEFAULT_MODELS['verifierModel']))
        return failures

    def _require_ollama_models(self, *model_names: str) -> list[str]:
        status = self._check_ollama()
        if not status.ok:
            return [status.summary if not status.detail else f'{status.summary} ({status.detail})']
        try:
            with urllib.request.urlopen(OLLAMA_TAGS_URL, timeout=2.5) as response:
                payload = json.loads(response.read().decode('utf-8'))
            models = {item.get('name', '') for item in payload.get('models', []) if item.get('name')}
        except Exception:
            with urllib.request.urlopen(OLLAMA_MODELS_URL, timeout=2.5) as response:
                payload = json.loads(response.read().decode('utf-8'))
            models = {item.get('id', '') for item in payload.get('data', []) if item.get('id')}

        normalized_models = self._normalize_ollama_model_names(models)
        missing = [
            model
            for model in model_names
            if self._normalize_ollama_model_name(model) not in normalized_models
        ]
        return [] if not missing else [f'Ollama model missing: {model}' for model in missing]

    def _build_command(self, action_key: str) -> tuple[list[str], Path, dict[str, str]]:
        selected_build = self.selected_build_var.get().strip()
        cwd = ROOT_DIR
        env = os.environ.copy()
        env['FOUNDRY_CONTROL_PANEL'] = '1'
        runtime = resolve_python_runtime(REPO_ROOT)
        if runtime:
            env.setdefault('PYTHON_EXECUTABLE', runtime.command)
        if self.semantic_verifier_var.get() and action_key == 'verify_candidates':
            env['RAG_ENABLE_SEMANTIC_VERIFIER'] = '1'
        else:
            env.pop('RAG_ENABLE_SEMANTIC_VERIFIER', None)

        if not runtime and action_key != 'promote_build':
            messagebox.showerror('Python runtime missing', 'No Python runtime could be resolved for sandbox actions.')
            return [], cwd, env

        python_command = [runtime.command, *runtime.args] if runtime else []

        if action_key == 'full_build':
            return [*python_command, 'foundry_task_runner.py', 'full-build'], cwd, env
        if action_key == 'repair_build':
            command = [*python_command, 'foundry_task_runner.py', 'repair-build', '--build-id', selected_build]
            repaired_build = self.repaired_build_var.get().strip()
            if repaired_build:
                command.extend(['--repaired-build-id', repaired_build])
            return command, cwd, env
        if action_key == 'build_manifest':
            return [*python_command, 'foundry_task_runner.py', 'build-manifest'], cwd, env
        if action_key == 'extract_pages':
            return [*python_command, 'foundry_task_runner.py', 'extract-pages', '--build-id', selected_build], cwd, env
        if action_key == 'derive_units':
            return [*python_command, 'foundry_task_runner.py', 'derive-units', '--build-id', selected_build], cwd, env
        if action_key == 'build_vectors':
            return [*python_command, 'foundry_task_runner.py', 'build-vectors', '--build-id', selected_build], cwd, env
        if action_key == 'generate_candidates':
            return [*python_command, 'foundry_task_runner.py', 'generate-candidates', '--build-id', selected_build], cwd, env
        if action_key == 'verify_candidates':
            return [*python_command, 'foundry_task_runner.py', 'verify-candidates', '--build-id', selected_build], cwd, env
        if action_key == 'score_and_dedupe':
            return [*python_command, 'foundry_task_runner.py', 'score-and-dedupe', '--build-id', selected_build], cwd, env
        if action_key == 'export_review':
            return [*python_command, 'foundry_task_runner.py', 'export-review', '--build-id', selected_build], cwd, env
        if action_key == 'locate_grounding':
            return [*python_command, 'foundry_task_runner.py', 'locate-grounding', '--build-id', selected_build], cwd, env
        if action_key == 'promote_build':
            return ['node', str(REPO_ROOT / 'scripts' / 'promote-foundry-build.mjs'), selected_build], REPO_ROOT, env
        if action_key == 'validate_python':
            py_files = [str(path.name) for path in sorted(ROOT_DIR.glob('*.py'))]
            lib_files = [str(path.relative_to(ROOT_DIR)) for path in sorted((ROOT_DIR / 'lib').glob('*.py'))]
            return [*python_command, '-m', 'py_compile', *py_files, *lib_files], cwd, env
        messagebox.showerror('Unknown action', action_key)
        return [], cwd, env

    def _reset_live_status(self, action_key: str) -> None:
        self.live_status_var.set('Status: running')
        self.live_action_var.set(f'Action: {action_key}')
        self.live_run_var.set('Run: pending manifest')
        self.live_stage_var.set('Stage: waiting for runner')
        self.live_progress_var.set('Progress: 0/0')
        self.live_elapsed_var.set('Elapsed: 00:00')
        self.live_cpu_var.set('CPU: n/a')
        self.live_memory_var.set('Memory: n/a')
        self.live_gpu_var.set('GPU: n/a')
        self.live_artifact_var.set('Telemetry: pending run context')
        self._live_started_monotonic = time.monotonic()
        self._live_elapsed_ms = 0
        self._resource_samples = 0
        self._cpu_avg = 0.0
        self._cpu_peak = 0.0
        self._memory_peak = 0.0
        self._gpu_peak = None
        self._gpu_memory_peak = None

    def _handle_runner_event(self, event: dict) -> None:
        event_type = event.get('type', '')
        run_id = event.get('runId') or 'n/a'
        source_build_id = event.get('sourceBuildId') or 'n/a'
        build_id = event.get('buildId') or run_id
        self.live_action_var.set(f"Action: {event.get('action', self.action_var.get())}")
        self.live_run_var.set(f'Run: {run_id} | Source: {source_build_id}')
        self.live_artifact_var.set(
            f"Telemetry: {get_build_paths(build_id).run_telemetry_path.name} | {get_build_paths(build_id).run_events_path.name}"
        )

        elapsed_ms = event.get('elapsedMs')
        if isinstance(elapsed_ms, int):
            self._live_elapsed_ms = max(self._live_elapsed_ms, elapsed_ms)
            self.live_elapsed_var.set(f'Elapsed: {self._format_duration_ms(self._live_elapsed_ms)}')

        if event_type == 'run_started':
            self.live_status_var.set('Status: running')
            self.live_progress_var.set(f"Progress: 0/{event.get('stageCount', 0)}")
            self.append_log(
                f"[telemetry] run started: {run_id} ({source_build_id}) with {event.get('stageCount', 0)} stages."
            )
            return

        if event_type == 'stage_started':
            stage_index = event.get('stageIndex', 0)
            stage_count = event.get('stageCount', 0)
            description = event.get('description') or ''
            self.live_stage_var.set(f"Stage: {stage_index}/{stage_count} {event.get('stageName', 'unknown')}")
            self.live_progress_var.set(f"Progress: {max(stage_index - 1, 0)}/{stage_count} completed")
            self.append_log(f"[telemetry] stage {stage_index}/{stage_count} started: {event.get('stageName')} - {description}")
            return

        if event_type == 'stage_completed':
            stage_index = event.get('stageIndex', 0)
            stage_count = event.get('stageCount', 0)
            duration_ms = event.get('stageDurationMs', 0)
            self.live_stage_var.set(f"Stage: completed {event.get('stageName', 'unknown')}")
            self.live_progress_var.set(f"Progress: {stage_index}/{stage_count} completed")
            self.append_log(
                f"[telemetry] stage completed: {event.get('stageName')} in {self._format_duration_ms(duration_ms)}"
            )
            return

        if event_type == 'stage_failed':
            self.live_status_var.set('Status: failed')
            self.live_stage_var.set(f"Stage: failed {event.get('stageName', 'unknown')}")
            self.append_log(
                f"[telemetry] stage failed: {event.get('stageName')} ({event.get('errorType')}): {event.get('errorMessage')}"
            )
            return

        if event_type == 'resource_sample':
            resources = event.get('resources') or {}
            self._update_live_resources(resources)
            return

        if event_type in {'run_completed', 'run_failed'}:
            status = event.get('status', 'completed')
            self.live_status_var.set(f'Status: {status}')
            summary_resources = event.get('resources') or {}
            if summary_resources:
                self._apply_resource_summary(summary_resources)
            self.live_stage_var.set('Stage: finished')
            self.append_log(f"[telemetry] run {status}: {run_id}")

    def _update_live_resources(self, resources: dict) -> None:
        cpu_value = float(resources.get('cpuPercent') or 0.0)
        self._resource_samples += 1
        self._cpu_avg = ((self._cpu_avg * (self._resource_samples - 1)) + cpu_value) / self._resource_samples
        self._cpu_peak = max(self._cpu_peak, cpu_value)
        self.live_cpu_var.set(f'CPU: now {cpu_value:.1f}% | avg {self._cpu_avg:.1f}% | peak {self._cpu_peak:.1f}%')

        memory_value = float(resources.get('memoryMb') or 0.0)
        self._memory_peak = max(self._memory_peak, memory_value)
        self.live_memory_var.set(f'Memory: now {memory_value:.1f} MB | peak {self._memory_peak:.1f} MB')

        gpu_value = resources.get('gpuUtilization')
        gpu_memory_value = resources.get('gpuMemoryMb')
        if gpu_value is not None:
            gpu_value = int(gpu_value)
            self._gpu_peak = gpu_value if self._gpu_peak is None else max(self._gpu_peak, gpu_value)
        if gpu_memory_value is not None:
            gpu_memory_value = int(gpu_memory_value)
            self._gpu_memory_peak = gpu_memory_value if self._gpu_memory_peak is None else max(self._gpu_memory_peak, gpu_memory_value)
        if gpu_value is not None or gpu_memory_value is not None:
            gpu_now = 'n/a' if gpu_value is None else f'{gpu_value}%'
            gpu_peak = 'n/a' if self._gpu_peak is None else f'{self._gpu_peak}%'
            gpu_mem_now = 'n/a' if gpu_memory_value is None else f'{gpu_memory_value} MB'
            gpu_mem_peak = 'n/a' if self._gpu_memory_peak is None else f'{self._gpu_memory_peak} MB'
            self.live_gpu_var.set(f'GPU: now {gpu_now} | peak {gpu_peak} | VRAM {gpu_mem_now} / {gpu_mem_peak}')

    def _apply_resource_summary(self, resources: dict) -> None:
        cpu_avg = float(resources.get('cpuPercentAvg') or 0.0)
        cpu_peak = float(resources.get('cpuPercentPeak') or 0.0)
        memory_current = float(resources.get('memoryMbCurrent') or 0.0)
        memory_peak = float(resources.get('memoryMbPeak') or 0.0)
        self.live_cpu_var.set(f'CPU: avg {cpu_avg:.1f}% | peak {cpu_peak:.1f}%')
        self.live_memory_var.set(f'Memory: end {memory_current:.1f} MB | peak {memory_peak:.1f} MB')
        gpu_peak = resources.get('gpuUtilizationPeak')
        gpu_memory_peak = resources.get('gpuMemoryMbPeak')
        if gpu_peak is None and gpu_memory_peak is None:
            self.live_gpu_var.set('GPU: n/a')
        else:
            gpu_peak_label = 'n/a' if gpu_peak is None else f'{int(gpu_peak)}%'
            gpu_memory_label = 'n/a' if gpu_memory_peak is None else f'{int(gpu_memory_peak)} MB'
            self.live_gpu_var.set(f'GPU: peak {gpu_peak_label} | VRAM peak {gpu_memory_label}')

    def _format_duration_ms(self, duration_ms: int) -> str:
        total_seconds = max(int(duration_ms / 1000), 0)
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        if hours:
            return f'{hours:02d}:{minutes:02d}:{seconds:02d}'
        return f'{minutes:02d}:{seconds:02d}'

    def _on_close(self) -> None:
        if self.running_process is not None:
            if not messagebox.askyesno('Process running', 'A process is still running. Close anyway?'):
                return
            self.running_process.terminate()
        self.root.destroy()


def main() -> None:
    root = tk.Tk()
    style = ttk.Style(root)
    if 'vista' in style.theme_names():
        style.theme_use('vista')
    app = FoundryControlApp(root)
    app.append_log('Foundry sandbox control panel ready.')
    root.mainloop()


if __name__ == '__main__':
    main()

from __future__ import annotations

import argparse
import ctypes
import json
import os
import shutil
import subprocess
import threading
import time
from pathlib import Path
from typing import Any, Callable

from build_manifest import build_manifest
from build_vectors import build_vectors
from derive_knowledge_units import build_knowledge_units
from export_review_package import export_review_package
from extract_pages_vision import extract_page_artifacts
from generate_candidates import generate_candidates
from lib.pipeline_common import (
    DEFAULT_MANUAL_PATH,
    get_build_paths,
    load_json,
    save_json,
    upsert_run_registry_entry,
    utc_now_iso,
)
from locate_pdf_grounding import enrich_grounding_locations
from repair_foundry_artifacts import run_repair_pipeline
from score_and_dedupe import score_and_dedupe
from verify_candidates import verify_candidates

PROMPT_TEMPLATE_VERSION = "v2-calibrated"
EVENT_PREFIX = "FOUNDRY_EVENT\t"
RESOURCE_SAMPLE_SECONDS = 2.0


def load_manifest_for_build(build_id: str | None) -> dict:
    if build_id:
        manifest = load_json(get_build_paths(build_id).manifest_path)
        if not manifest:
            raise FileNotFoundError(f"Missing manifest for build {build_id}")
        return manifest
    return build_manifest()


class _ProcessMemoryCounters(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong),
        ("PageFaultCount", ctypes.c_ulong),
        ("PeakWorkingSetSize", ctypes.c_size_t),
        ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
    ]


class RunTelemetryRecorder:
    def __init__(self, action: str, manifest: dict, total_stages: int) -> None:
        self.action = action
        self.manifest = manifest
        self.build_id = manifest["buildId"]
        self.run_id = manifest["runId"]
        self.source_build_id = manifest["sourceBuildId"]
        self.build_paths = get_build_paths(self.build_id)
        self.total_stages = total_stages
        self.started_at = utc_now_iso()
        self.started_perf = time.perf_counter()
        self._stage_name: str | None = None
        self._stage_index = 0
        self._stage_started_perf = 0.0
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._resource_thread: threading.Thread | None = None
        self._nvidia_smi = shutil.which("nvidia-smi")
        self._last_cpu_process = time.process_time()
        self._last_cpu_wall = time.perf_counter()
        self._resource_summary = self._load_resource_summary()
        self._action_history = self._load_action_history()
        self._action_entry = {
            "action": action,
            "status": "running",
            "startedAt": self.started_at,
            "endedAt": None,
            "durationMs": None,
            "stageCount": total_stages,
        }
        self._action_history.append(self._action_entry)
        self._telemetry = {
            "runId": self.run_id,
            "buildId": self.build_id,
            "sourceBuildId": self.source_build_id,
            "createdAt": manifest.get("createdAt"),
            "latestAction": self.action,
            "latestStatus": "running",
            "currentStage": None,
            "stageProgress": {
                "completed": 0,
                "total": total_stages,
            },
            "models": manifest.get("models") or {},
            "promptTemplateVersion": PROMPT_TEMPLATE_VERSION,
            "semanticVerifierEnabled": os.getenv("RAG_ENABLE_SEMANTIC_VERIFIER", "0") == "1",
            "initiatedBy": "control-panel" if os.getenv("FOUNDRY_CONTROL_PANEL") == "1" else "cli",
            "resources": self._resource_summary,
            "actions": self._action_history,
            "stages": self._load_stage_summary(),
            "startedAt": self.started_at,
            "updatedAt": self.started_at,
        }

    def start(self) -> None:
        self._write_telemetry()
        self.emit_event(
            "run_started",
            action=self.action,
            stageCount=self.total_stages,
            initiatedBy=self._telemetry["initiatedBy"],
        )
        self._resource_thread = threading.Thread(target=self._resource_sampler_loop, daemon=True)
        self._resource_thread.start()

    def start_stage(self, name: str, index: int, description: str) -> None:
        with self._lock:
            self._stage_name = name
            self._stage_index = index
            self._stage_started_perf = time.perf_counter()
            self._telemetry["currentStage"] = {
                "name": name,
                "index": index,
                "description": description,
                "startedAt": utc_now_iso(),
            }
            self._telemetry["updatedAt"] = utc_now_iso()
            self._write_telemetry()
        self.emit_event(
            "stage_started",
            stageName=name,
            stageIndex=index,
            stageCount=self.total_stages,
            description=description,
            elapsedMs=self._elapsed_ms(),
        )

    def complete_stage(self, name: str, metrics: dict[str, Any] | None = None) -> None:
        metrics = metrics or {}
        stage_elapsed = self._current_stage_elapsed_ms()
        with self._lock:
            completed = max(self._telemetry["stageProgress"]["completed"], self._stage_index)
            self._telemetry["stageProgress"]["completed"] = completed
            self._telemetry["currentStage"] = None
            self._telemetry["stages"][name] = {
                "status": "completed",
                "durationMs": stage_elapsed,
                "completedAt": utc_now_iso(),
                "metrics": metrics,
            }
            self._telemetry["updatedAt"] = utc_now_iso()
            self._write_telemetry()
            self._stage_name = None
            self._stage_started_perf = 0.0
        self.emit_event(
            "stage_completed",
            stageName=name,
            stageIndex=self._stage_index,
            stageCount=self.total_stages,
            stageDurationMs=stage_elapsed,
            elapsedMs=self._elapsed_ms(),
            metrics=metrics,
        )

    def fail_stage(self, error: Exception) -> None:
        stage_name = self._stage_name or "unknown"
        stage_elapsed = self._current_stage_elapsed_ms()
        with self._lock:
            self._telemetry["currentStage"] = None
            self._telemetry["stages"][stage_name] = {
                "status": "failed",
                "durationMs": stage_elapsed,
                "failedAt": utc_now_iso(),
                "errorType": type(error).__name__,
                "errorMessage": str(error),
            }
            self._telemetry["updatedAt"] = utc_now_iso()
            self._write_telemetry()
        self.emit_event(
            "stage_failed",
            stageName=stage_name,
            stageIndex=self._stage_index,
            stageCount=self.total_stages,
            stageDurationMs=stage_elapsed,
            elapsedMs=self._elapsed_ms(),
            errorType=type(error).__name__,
            errorMessage=str(error),
        )

    def finish(self, status: str, summary: dict[str, Any] | None = None) -> None:
        summary = summary or {}
        self._stop_event.set()
        if self._resource_thread and self._resource_thread.is_alive():
            self._resource_thread.join(timeout=3)
        duration_ms = self._elapsed_ms()
        with self._lock:
            self._action_entry["status"] = status
            self._action_entry["endedAt"] = utc_now_iso()
            self._action_entry["durationMs"] = duration_ms
            self._telemetry["latestStatus"] = status
            self._telemetry["currentStage"] = None
            self._telemetry["updatedAt"] = utc_now_iso()
            self._telemetry["resources"] = self._resource_summary
            self._telemetry["finalSummary"] = summary
            self._write_telemetry()
        self.emit_event(
            "run_completed" if status == "completed" else "run_failed",
            status=status,
            elapsedMs=duration_ms,
            summary=summary,
            resources=self._resource_summary,
        )

    def emit_event(self, event_type: str, **payload: Any) -> None:
        event = {
            "type": event_type,
            "timestamp": utc_now_iso(),
            "action": self.action,
            "buildId": self.build_id,
            "runId": self.run_id,
            "sourceBuildId": self.source_build_id,
            **payload,
        }
        with self.build_paths.run_events_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")))
            handle.write("\n")
        print(f"{EVENT_PREFIX}{json.dumps(event, ensure_ascii=False)}", flush=True)

    def _elapsed_ms(self) -> int:
        return int((time.perf_counter() - self.started_perf) * 1000)

    def _current_stage_elapsed_ms(self) -> int:
        if not self._stage_started_perf:
            return 0
        return int((time.perf_counter() - self._stage_started_perf) * 1000)

    def _write_telemetry(self) -> None:
        save_json(self.build_paths.run_telemetry_path, self._telemetry)

    def _load_stage_summary(self) -> dict[str, Any]:
        existing = load_json(self.build_paths.run_telemetry_path, default={}) or {}
        return existing.get("stages", {})

    def _load_action_history(self) -> list[dict[str, Any]]:
        existing = load_json(self.build_paths.run_telemetry_path, default={}) or {}
        return list(existing.get("actions", []))

    def _load_resource_summary(self) -> dict[str, Any]:
        existing = load_json(self.build_paths.run_telemetry_path, default={}) or {}
        summary = existing.get("resources", {}) or {}
        summary.setdefault("sampleCount", 0)
        summary.setdefault("cpuPercentAvg", 0.0)
        summary.setdefault("cpuPercentPeak", 0.0)
        summary.setdefault("memoryMbCurrent", 0.0)
        summary.setdefault("memoryMbPeak", 0.0)
        summary.setdefault("gpuUtilizationPeak", None)
        summary.setdefault("gpuMemoryMbPeak", None)
        summary.setdefault("lastSample", None)
        return summary

    def _resource_sampler_loop(self) -> None:
        while not self._stop_event.wait(RESOURCE_SAMPLE_SECONDS):
            sample = self._sample_resources()
            if not sample:
                continue
            with self._lock:
                self._merge_resource_sample(sample)
                self._telemetry["resources"] = self._resource_summary
                self._telemetry["updatedAt"] = utc_now_iso()
                self._write_telemetry()
            self.emit_event("resource_sample", resources=sample, elapsedMs=self._elapsed_ms())

    def _merge_resource_sample(self, sample: dict[str, Any]) -> None:
        resource_summary = self._resource_summary
        previous_count = int(resource_summary.get("sampleCount", 0))
        next_count = previous_count + 1
        cpu_value = float(sample.get("cpuPercent") or 0.0)
        previous_average = float(resource_summary.get("cpuPercentAvg", 0.0))
        resource_summary["sampleCount"] = next_count
        resource_summary["cpuPercentAvg"] = round(
            ((previous_average * previous_count) + cpu_value) / next_count,
            2,
        )
        resource_summary["cpuPercentPeak"] = round(
            max(float(resource_summary.get("cpuPercentPeak", 0.0)), cpu_value),
            2,
        )
        memory_current = float(sample.get("memoryMb") or 0.0)
        resource_summary["memoryMbCurrent"] = round(memory_current, 2)
        resource_summary["memoryMbPeak"] = round(
            max(float(resource_summary.get("memoryMbPeak", 0.0)), memory_current),
            2,
        )
        gpu_utilization = sample.get("gpuUtilization")
        if gpu_utilization is not None:
            previous_gpu_peak = resource_summary.get("gpuUtilizationPeak")
            resource_summary["gpuUtilizationPeak"] = gpu_utilization if previous_gpu_peak is None else max(previous_gpu_peak, gpu_utilization)
        gpu_memory = sample.get("gpuMemoryMb")
        if gpu_memory is not None:
            previous_gpu_memory_peak = resource_summary.get("gpuMemoryMbPeak")
            resource_summary["gpuMemoryMbPeak"] = gpu_memory if previous_gpu_memory_peak is None else max(previous_gpu_memory_peak, gpu_memory)
        resource_summary["lastSample"] = sample

    def _sample_resources(self) -> dict[str, Any]:
        sample = {
            "sampledAt": utc_now_iso(),
            "cpuPercent": self._read_cpu_percent(),
            "memoryMb": self._read_memory_mb(),
        }
        gpu_sample = self._read_gpu_sample()
        if gpu_sample:
            sample.update(gpu_sample)
        return sample

    def _read_cpu_percent(self) -> float:
        current_cpu = time.process_time()
        current_wall = time.perf_counter()
        delta_cpu = current_cpu - self._last_cpu_process
        delta_wall = max(current_wall - self._last_cpu_wall, 1e-6)
        self._last_cpu_process = current_cpu
        self._last_cpu_wall = current_wall
        cpu_count = max(os.cpu_count() or 1, 1)
        return round((delta_cpu / delta_wall) * 100.0 / cpu_count, 2)

    def _read_memory_mb(self) -> float | None:
        if os.name != "nt":
            return None
        counters = _ProcessMemoryCounters()
        counters.cb = ctypes.sizeof(_ProcessMemoryCounters)
        success = ctypes.windll.psapi.GetProcessMemoryInfo(  # type: ignore[attr-defined]
            ctypes.windll.kernel32.GetCurrentProcess(),  # type: ignore[attr-defined]
            ctypes.byref(counters),
            counters.cb,
        )
        if not success:
            return None
        return round(counters.WorkingSetSize / (1024 * 1024), 2)

    def _read_gpu_sample(self) -> dict[str, Any] | None:
        if not self._nvidia_smi:
            return None
        try:
            result = subprocess.run(
                [
                    self._nvidia_smi,
                    "--query-gpu=utilization.gpu,memory.used",
                    "--format=csv,noheader,nounits",
                ],
                check=True,
                capture_output=True,
                text=True,
                timeout=2,
            )
        except Exception:
            return None
        for line in result.stdout.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            parts = [part.strip() for part in stripped.split(",")]
            if len(parts) >= 2:
                try:
                    return {
                        "gpuUtilization": int(parts[0]),
                        "gpuMemoryMb": int(parts[1]),
                    }
                except ValueError:
                    return None
        return None


def _stage_metrics(**values: Any) -> dict[str, Any]:
    return {key: value for key, value in values.items() if value is not None}


def _run_stage(
    recorder: RunTelemetryRecorder,
    name: str,
    index: int,
    description: str,
    fn: Callable[[], Any],
    metrics_builder: Callable[[Any], dict[str, Any]],
) -> Any:
    recorder.start_stage(name, index, description)
    try:
        value = fn()
    except Exception as error:
        recorder.fail_stage(error)
        raise
    recorder.complete_stage(name, metrics_builder(value))
    return value


def run_action(
    action: str,
    build_id: str | None = None,
    repaired_build_id: str | None = None,
) -> dict:
    if action == "repair-build":
        if not build_id:
            raise ValueError("--build-id is required for repair-build")
        manifest = load_manifest_for_build(build_id)
        recorder = RunTelemetryRecorder(action, manifest, total_stages=1)
        recorder.start()
        try:
            result = _run_stage(
                recorder,
                "repair-build",
                1,
                "Repair page artifacts and rebuild derived outputs",
                lambda: run_repair_pipeline(build_id, repaired_build_id),
                lambda value: _stage_metrics(
                    repairedRunId=value.get("runId"),
                    sourceBuildId=value.get("sourceBuildId"),
                ),
            )
            _update_registry_from_result(result, status="completed")
            recorder.finish("completed", result)
            return result
        except Exception as error:
            _update_registry_from_result(
                {
                    "buildId": manifest["buildId"],
                    "runId": manifest["runId"],
                    "sourceBuildId": manifest["sourceBuildId"],
                },
                manifest=manifest,
                status="failed",
            )
            recorder.finish("failed", {"errorType": type(error).__name__, "errorMessage": str(error)})
            raise

    if action == "full-build":
        manifest = build_manifest()
        recorder = RunTelemetryRecorder(action, manifest, total_stages=8)
        recorder.start()
        try:
            _run_stage(
                recorder,
                "build-manifest",
                1,
                "Resolve source lineage and create run artifact root",
                lambda: manifest,
                lambda value: _stage_metrics(
                    buildId=value["buildId"],
                    runId=value["runId"],
                    sourceBuildId=value["sourceBuildId"],
                ),
            )
            page_artifacts = _run_stage(
                recorder,
                "extract-pages",
                2,
                "Render manual pages and run vision OCR extraction",
                lambda: extract_page_artifacts(manifest),
                lambda value: _stage_metrics(pageArtifactCount=len(value)),
            )
            units = _run_stage(
                recorder,
                "derive-units",
                3,
                "Derive structured knowledge units from page artifacts",
                lambda: build_knowledge_units(manifest),
                lambda value: _stage_metrics(knowledgeUnitCount=len(value)),
            )
            vector_stats = _run_stage(
                recorder,
                "build-vectors",
                4,
                "Embed knowledge units for retrieval and comparison",
                lambda: build_vectors(manifest),
                lambda value: _stage_metrics(vectorCount=value.get("vectorCount")),
            )
            candidates = _run_stage(
                recorder,
                "generate-candidates",
                5,
                "Generate candidate questions from knowledge units",
                lambda: generate_candidates(manifest),
                lambda value: _stage_metrics(candidateCount=len(value)),
            )
            verification = _run_stage(
                recorder,
                "verify-candidates",
                6,
                "Run deterministic and optional semantic verifier checks",
                lambda: verify_candidates(manifest),
                lambda value: _stage_metrics(
                    verifiedCount=value[1].get("verifiedCount"),
                    rejectedCount=value[1].get("rejectedCount"),
                ),
            )
            dedupe_report = _run_stage(
                recorder,
                "score-and-dedupe",
                7,
                "Cluster and score duplicate candidates within the run",
                lambda: score_and_dedupe(manifest),
                lambda value: _stage_metrics(
                    dedupedWithinBuild=value.get("dedupedWithinBuild"),
                    duplicateClusterCount=value.get("duplicateClusterCount"),
                ),
            )
            review_export = _run_stage(
                recorder,
                "export-review",
                8,
                "Write review package, chapter JSONL, and novelty report",
                lambda: export_review_package(manifest),
                lambda value: _stage_metrics(reviewExportCount=len(value)),
            )

            review_manifest = load_json(get_build_paths(manifest["buildId"]).review_export_dir / "manifest.json", default={}) or {}
            verification_report = verification[1]
            result = {
                "action": action,
                "buildId": manifest["buildId"],
                "runId": manifest["runId"],
                "sourceBuildId": manifest["sourceBuildId"],
                "pageArtifactCount": len(page_artifacts),
                "knowledgeUnitCount": len(units),
                "vectorCount": vector_stats["vectorCount"],
                "candidateCount": len(candidates),
                "verifiedCount": verification_report["verifiedCount"],
                "rejectedCount": verification_report["rejectedCount"],
                "dedupedWithinBuild": dedupe_report["dedupedWithinBuild"],
                "reviewExportCount": len(review_export),
                "noveltyRate": review_manifest.get("noveltyRate"),
                "exactDuplicateCount": review_manifest.get("exactDuplicateCount"),
                "nearDuplicateCount": review_manifest.get("nearDuplicateCount"),
                "novelCandidateCount": review_manifest.get("novelCandidateCount"),
                "noveltyWarning": review_manifest.get("noveltyWarning"),
            }
            _update_registry_from_result(result, manifest=manifest, status="completed")
            recorder.finish("completed", result)
            return result
        except Exception as error:
            _update_registry_from_result(
                {
                    "buildId": manifest["buildId"],
                    "runId": manifest["runId"],
                    "sourceBuildId": manifest["sourceBuildId"],
                },
                manifest=manifest,
                status="failed",
            )
            recorder.finish("failed", {"errorType": type(error).__name__, "errorMessage": str(error)})
            raise

    manifest = build_manifest() if action == "build-manifest" else load_manifest_for_build(build_id)
    recorder = RunTelemetryRecorder(action, manifest, total_stages=1)
    recorder.start()

    try:
        if action == "build-manifest":
            result = _run_stage(
                recorder,
                "build-manifest",
                1,
                "Resolve source lineage and create run artifact root",
                lambda: manifest,
                lambda value: _stage_metrics(
                    buildId=value["buildId"],
                    runId=value["runId"],
                    sourceBuildId=value["sourceBuildId"],
                ),
            )
            payload = {
                "action": action,
                "buildId": result["buildId"],
                "runId": result["runId"],
                "sourceBuildId": result["sourceBuildId"],
            }
            _update_registry_from_result(payload, manifest=manifest)
            recorder.finish("completed", payload)
            return payload

        result: dict

        if action == "extract-pages":
            page_artifacts = _run_stage(
                recorder,
                "extract-pages",
                1,
                "Render manual pages and run vision OCR extraction",
                lambda: extract_page_artifacts(manifest),
                lambda value: _stage_metrics(pageArtifactCount=len(value)),
            )
            result = {"action": action, "buildId": manifest["buildId"], "runId": manifest["runId"], "sourceBuildId": manifest["sourceBuildId"], "pageArtifactCount": len(page_artifacts)}
        elif action == "derive-units":
            units = _run_stage(
                recorder,
                "derive-units",
                1,
                "Derive structured knowledge units from page artifacts",
                lambda: build_knowledge_units(manifest),
                lambda value: _stage_metrics(knowledgeUnitCount=len(value)),
            )
            result = {"action": action, "buildId": manifest["buildId"], "runId": manifest["runId"], "sourceBuildId": manifest["sourceBuildId"], "knowledgeUnitCount": len(units)}
        elif action == "build-vectors":
            vector_stats = _run_stage(
                recorder,
                "build-vectors",
                1,
                "Embed knowledge units for retrieval and comparison",
                lambda: build_vectors(manifest),
                lambda value: _stage_metrics(vectorCount=value.get("vectorCount")),
            )
            result = {"action": action, "buildId": manifest["buildId"], "runId": manifest["runId"], "sourceBuildId": manifest["sourceBuildId"], **vector_stats}
        elif action == "generate-candidates":
            candidates = _run_stage(
                recorder,
                "generate-candidates",
                1,
                "Generate candidate questions from knowledge units",
                lambda: generate_candidates(manifest),
                lambda value: _stage_metrics(candidateCount=len(value)),
            )
            result = {"action": action, "buildId": manifest["buildId"], "runId": manifest["runId"], "sourceBuildId": manifest["sourceBuildId"], "candidateCount": len(candidates)}
        elif action == "verify-candidates":
            _, report = _run_stage(
                recorder,
                "verify-candidates",
                1,
                "Run deterministic and optional semantic verifier checks",
                lambda: verify_candidates(manifest),
                lambda value: _stage_metrics(
                    verifiedCount=value[1].get("verifiedCount"),
                    rejectedCount=value[1].get("rejectedCount"),
                ),
            )
            result = {"action": action, **report}
        elif action == "score-and-dedupe":
            dedupe_report = _run_stage(
                recorder,
                "score-and-dedupe",
                1,
                "Cluster and score duplicate candidates within the run",
                lambda: score_and_dedupe(manifest),
                lambda value: _stage_metrics(
                    dedupedWithinBuild=value.get("dedupedWithinBuild"),
                    duplicateClusterCount=value.get("duplicateClusterCount"),
                ),
            )
            result = {"action": action, **dedupe_report}
        elif action == "export-review":
            review_export = _run_stage(
                recorder,
                "export-review",
                1,
                "Write review package, chapter JSONL, and novelty report",
                lambda: export_review_package(manifest),
                lambda value: _stage_metrics(reviewExportCount=len(value)),
            )
            review_manifest = load_json(get_build_paths(manifest["buildId"]).review_export_dir / "manifest.json", default={}) or {}
            result = {
                "action": action,
                "buildId": manifest["buildId"],
                "runId": manifest["runId"],
                "sourceBuildId": manifest["sourceBuildId"],
                "reviewExportCount": len(review_export),
                "noveltyRate": review_manifest.get("noveltyRate"),
                "exactDuplicateCount": review_manifest.get("exactDuplicateCount"),
                "nearDuplicateCount": review_manifest.get("nearDuplicateCount"),
                "novelCandidateCount": review_manifest.get("novelCandidateCount"),
                "noveltyWarning": review_manifest.get("noveltyWarning"),
            }
        elif action == "locate-grounding":
            grounding_report = _run_stage(
                recorder,
                "locate-grounding",
                1,
                "Attach PDF bounding boxes to grounding spans",
                lambda: enrich_grounding_locations(manifest),
                lambda value: value if isinstance(value, dict) else {},
            )
            result = {"action": action, **grounding_report}
        else:
            raise ValueError(f"Unsupported action: {action}")

        _update_registry_from_result(result, manifest=manifest, status="completed" if action in {"export-review"} else None)
        recorder.finish("completed", result)
        return result
    except Exception as error:
        _update_registry_from_result(
            {
                "buildId": manifest["buildId"],
                "runId": manifest["runId"],
                "sourceBuildId": manifest["sourceBuildId"],
            },
            manifest=manifest,
            status="failed",
        )
        recorder.finish("failed", {"errorType": type(error).__name__, "errorMessage": str(error)})
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Foundry sandbox stages against an explicit build.")
    parser.add_argument(
        "action",
        choices=[
            "build-manifest",
            "full-build",
            "repair-build",
            "extract-pages",
            "derive-units",
            "build-vectors",
            "generate-candidates",
            "verify-candidates",
            "score-and-dedupe",
            "export-review",
            "locate-grounding",
        ],
    )
    parser.add_argument("--build-id")
    parser.add_argument("--repaired-build-id")
    parser.add_argument("--manual-path", default=str(DEFAULT_MANUAL_PATH), help=argparse.SUPPRESS)
    return parser.parse_args()


def _update_registry_from_result(
    result: dict,
    manifest: dict | None = None,
    status: str | None = None,
) -> None:
    run_id = result.get("runId") or result.get("buildId")
    source_build_id = result.get("sourceBuildId") or (manifest or {}).get("sourceBuildId")
    if not run_id or not source_build_id:
        return
    models = (manifest or {}).get("models") or {}
    upsert_run_registry_entry(
        {
            "runId": run_id,
            "buildId": result.get("buildId", run_id),
            "sourceBuildId": source_build_id,
            "parentRunId": (manifest or {}).get("parentRunId"),
            "manualHash": (manifest or {}).get("manualHash"),
            "manualYear": (manifest or {}).get("manualYear"),
            "editionId": (manifest or {}).get("editionId"),
            "createdAt": (manifest or {}).get("createdAt"),
            "status": status or "running",
            "models": models,
            "generatorModel": models.get("generatorModel"),
            "verifierModel": models.get("verifierModel"),
            "embedModel": models.get("embedModel"),
            "visionModel": models.get("visionModel"),
            "promptTemplateVersion": PROMPT_TEMPLATE_VERSION,
            "maxCandidatesPerUnit": int(os.getenv("RAG_MAX_CANDIDATES_PER_UNIT", "2")),
            "semanticVerifierEnabled": os.getenv("RAG_ENABLE_SEMANTIC_VERIFIER", "0") == "1",
            "pageArtifactCount": result.get("pageArtifactCount"),
            "knowledgeUnitCount": result.get("knowledgeUnitCount"),
            "vectorCount": result.get("vectorCount"),
            "candidateCount": result.get("candidateCount"),
            "verifiedCount": result.get("verifiedCount"),
            "rejectedCount": result.get("rejectedCount"),
            "dedupedWithinRunCount": result.get("dedupedWithinBuild"),
            "exportCount": result.get("reviewExportCount"),
            "noveltyRate": result.get("noveltyRate"),
            "exactDuplicateCount": result.get("exactDuplicateCount"),
            "nearDuplicateCount": result.get("nearDuplicateCount"),
            "novelCandidateCount": result.get("novelCandidateCount"),
            "noveltyWarning": result.get("noveltyWarning"),
        }
    )


if __name__ == "__main__":
    args = parse_args()
    result = run_action(args.action, build_id=args.build_id, repaired_build_id=args.repaired_build_id)
    print(json.dumps(result, ensure_ascii=False, indent=2))

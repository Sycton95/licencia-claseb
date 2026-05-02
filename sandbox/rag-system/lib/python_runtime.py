from __future__ import annotations

import os
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PythonRuntime:
    command: str
    args: tuple[str, ...] = ()
    source: str = ""


def _candidate_file(path: Path, source: str, args: tuple[str, ...] = ()) -> PythonRuntime | None:
    return PythonRuntime(str(path), args=args, source=source) if path.exists() else None


def _candidate_named(command: str, source: str, args: tuple[str, ...] = ()) -> PythonRuntime | None:
    resolved = shutil.which(command)
    return PythonRuntime(resolved, args=args, source=source) if resolved else None


def get_python_runtime_candidates(repo_root: Path) -> list[PythonRuntime]:
    candidates: list[PythonRuntime] = []
    seen = set()

    def add(runtime: PythonRuntime | None) -> None:
        if runtime is None:
            return
        key = (runtime.command.lower(), runtime.args)
        if key in seen:
            return
        seen.add(key)
        candidates.append(runtime)

    env_python = os.getenv("PYTHON_EXECUTABLE")
    if env_python:
        add(PythonRuntime(env_python, source="PYTHON_EXECUTABLE"))

    if sys.executable:
        add(PythonRuntime(sys.executable, source="sys.executable"))

    add(_candidate_file(repo_root / ".venv" / "Scripts" / "python.exe", ".venv"))
    add(_candidate_file(repo_root / "venv" / "Scripts" / "python.exe", "venv"))
    add(_candidate_file(Path(r"C:\Windows\py.exe"), "py-launcher", args=("-3",)))
    add(_candidate_file(Path(r"C:\Users\franc\AppData\Local\Programs\Python\Python314\python.exe"), "known-user-python"))
    add(_candidate_named("python", "PATH:python"))
    add(_candidate_named("py", "PATH:py", args=("-3",)))
    return candidates


def resolve_python_runtime(repo_root: Path) -> PythonRuntime | None:
    for runtime in get_python_runtime_candidates(repo_root):
        if Path(runtime.command).exists() or shutil.which(runtime.command):
            return runtime
    return None

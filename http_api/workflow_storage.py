"""Filesystem persistence for workflow specs (WorkflowSpec)."""

from __future__ import annotations

import json
import uuid
from pathlib import Path

from workflow.schema import WorkflowSpec

STORED_DIR = Path("workflows/stored")
TEMPLATES_DIR = Path("workflows/templates")


def ensure_dirs() -> None:
    STORED_DIR.mkdir(parents=True, exist_ok=True)
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)


def _path(workflow_id: str) -> Path:
    return STORED_DIR / f"{workflow_id}.json"


def list_stored_ids() -> list[str]:
    ensure_dirs()
    return sorted(p.stem for p in STORED_DIR.glob("*.json") if p.is_file())


def list_template_ids() -> list[str]:
    ensure_dirs()
    return sorted(p.stem for p in TEMPLATES_DIR.glob("*.json") if p.is_file())


def load_workflow(workflow_id: str) -> WorkflowSpec:
    path = _path(workflow_id)
    if not path.exists():
        raise FileNotFoundError(workflow_id)
    raw = json.loads(path.read_text(encoding="utf-8"))
    return WorkflowSpec.model_validate(raw)


def save_workflow(spec: WorkflowSpec) -> WorkflowSpec:
    ensure_dirs()
    wid = spec.id or str(uuid.uuid4())
    spec = spec.model_copy(update={"id": wid})
    path = STORED_DIR / f"{wid}.json"
    path.write_text(spec.model_dump_json(indent=2), encoding="utf-8")
    return spec


def delete_workflow(workflow_id: str) -> None:
    path = _path(workflow_id)
    if path.exists():
        path.unlink()


def load_template(template_id: str) -> WorkflowSpec:
    ensure_dirs()
    path = TEMPLATES_DIR / f"{template_id}.json"
    if not path.exists():
        raise FileNotFoundError(template_id)
    raw = json.loads(path.read_text(encoding="utf-8"))
    return WorkflowSpec.model_validate(raw)


def clone_template(template_id: str, name: str) -> WorkflowSpec:
    tpl = load_template(template_id)
    fresh_id = str(uuid.uuid4())
    clone = tpl.model_copy(update={"id": fresh_id, "name": name}, deep=True)
    return save_workflow(clone)

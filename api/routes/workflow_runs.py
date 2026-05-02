"""Workflow run: start async DAG execution, pollable status, WebSocket event stream."""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from workflow.engine import WorkflowEngine
from workflow.schema import WorkflowRunCreate

from api.deps import workflow_hub_singleton
from api.workflow_storage import load_workflow

router = APIRouter()
_LOG = logging.getLogger(__name__)


def _run_meta_path(run_id: str) -> Path:
    return Path("outputs") / run_id / "workflow_run.json"


@router.post("")
async def start_run(body: WorkflowRunCreate) -> dict[str, str]:
    if body.workflow is not None:
        spec = body.workflow
    else:
        if not body.workflow_id:
            raise HTTPException(status_code=422, detail="workflow_id required when workflow inline omitted")
        try:
            spec = load_workflow(body.workflow_id)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="workflow not found")

    import uuid

    run_id = str(uuid.uuid4())
    hub = workflow_hub_singleton()
    engine = WorkflowEngine(hub=hub, use_memory=True)

    inputs = dict(body.inputs)

    async def runner() -> None:
        try:
            await engine.execute(spec, run_id, inputs)
        except Exception:
            _LOG.exception("workflow run failed")

    asyncio.create_task(runner())
    return {"run_id": run_id}


@router.get("/{run_id}")
def get_run(run_id: str) -> dict:
    path = _run_meta_path(run_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="run not found")
    return json.loads(path.read_text(encoding="utf-8"))


@router.websocket("/{run_id}/ws")
async def run_ws(websocket: WebSocket, run_id: str) -> None:
    await websocket.accept()
    events_path = Path("outputs") / run_id / "events.jsonl"
    meta_path = _run_meta_path(run_id)
    offset = 0
    try:
        while True:
            if events_path.exists():
                text = events_path.read_text(encoding="utf-8")
                if len(text) > offset:
                    chunk = text[offset:]
                    for line in chunk.splitlines():
                        line = line.strip()
                        if line:
                            await websocket.send_json(json.loads(line))
                    offset = len(text)
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    meta = {}
                if meta.get("status") in ("completed", "failed"):
                    await websocket.send_json(
                        {"type": "sync", "status": meta.get("status"), "meta": meta}
                    )
                    return
            await asyncio.sleep(0.12)
    except WebSocketDisconnect:
        pass

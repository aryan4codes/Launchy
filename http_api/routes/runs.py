"""Run endpoints."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from http_api.deps import get_pipeline_controller
from core.config import ContentPiece, RunConfig, RunResult, RunSummary
from core.pipeline import PipelineController

router = APIRouter()


@router.post("/", response_model=RunResult)
def create_run(
    body: RunConfig,
    ctrl: PipelineController = Depends(get_pipeline_controller),
) -> RunResult:
    return ctrl.run(body)


@router.get("/{run_id}/pieces")
def get_run_pieces(run_id: str) -> list[dict]:
    path = Path("outputs") / f"{run_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="run not found")
    raw = json.loads(path.read_text(encoding="utf-8"))
    return raw.get("pieces", [])


@router.get("/{run_id}", response_model=RunResult)
def get_run(run_id: str) -> RunResult:
    path = Path("outputs") / f"{run_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="run not found")
    raw = json.loads(path.read_text(encoding="utf-8"))
    pieces = [ContentPiece(**p) for p in raw.get("pieces", [])]
    summary = RunSummary(**raw["summary"]) if raw.get("summary") else None
    return RunResult(
        success=bool(raw.get("success", False)),
        run_id=raw.get("run_id", run_id),
        pieces=pieces,
        summary=summary,
        error=raw.get("error"),
    )

"""Pipeline controller — single entry point for CLI and API."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Protocol

from core.config import RunConfig, RunResult
from core.logging import configure_logging, log_event


class PipelineRunner(Protocol):
    def run(self, config: RunConfig) -> RunResult: ...


class PipelineController:
    def __init__(
        self,
        runner: PipelineRunner | None = None,
        output_dir: Path | None = None,
    ) -> None:
        configure_logging()
        self._runner = runner
        self._output_dir = output_dir or Path("outputs")

    @property
    def runner(self) -> PipelineRunner:
        if self._runner is None:
            from agents.crew_adapter import CrewAIPipelineRunner

            self._runner = CrewAIPipelineRunner()
        return self._runner

    def run(self, config: RunConfig) -> RunResult:
        run_id = config.resolved_run_id()
        cfg = config.model_copy(update={"run_id": run_id})
        log_event("run_started", run_id=run_id, niche=cfg.niche)
        result = self.runner.run(cfg)
        log_event(
            "run_finished",
            run_id=run_id,
            success=result.success,
            pieces=len(result.pieces),
        )
        if result.success:
            self._write_output(run_id, result)
        return result

    def _write_output(self, run_id: str, result: RunResult) -> None:
        self._output_dir.mkdir(parents=True, exist_ok=True)
        path = self._output_dir / f"{run_id}.json"
        data: dict[str, Any] = {
            "run_id": run_id,
            "success": result.success,
            "pieces": [p.model_dump() for p in result.pieces],
            "summary": result.summary.model_dump() if result.summary else None,
            "error": result.error,
        }
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def get_controller(runner: PipelineRunner | None = None) -> PipelineController:
    return PipelineController(runner=runner)


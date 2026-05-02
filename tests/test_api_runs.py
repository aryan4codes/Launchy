"""FastAPI run routes."""

from __future__ import annotations

from fastapi.testclient import TestClient

from http_api.deps import get_pipeline_controller
from http_api.server import app
from core.config import RunConfig, RunResult, RunSummary
from core.pipeline import PipelineController


class _FakeRunner:
    def run(self, cfg: RunConfig) -> RunResult:
        return RunResult(
            success=True,
            run_id=cfg.resolved_run_id(),
            pieces=[],
            summary=RunSummary(total_pieces=0),
        )


def test_post_run_overridden_controller() -> None:
    fake = PipelineController(runner=_FakeRunner())
    app.dependency_overrides[get_pipeline_controller] = lambda: fake
    try:
        client = TestClient(app)
        res = client.post("/runs/", json={"niche": "AI SaaS"})
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["run_id"]
    finally:
        app.dependency_overrides.clear()


def test_health() -> None:
    client = TestClient(app)
    assert client.get("/health").json()["status"] == "ok"

"""Pipeline orchestration smoke tests (no live LLM)."""

from __future__ import annotations

from pathlib import Path

from core.config import ContentPiece, RunConfig, RunResult, RunSummary, default_subreddit_csv
from core.pipeline import PipelineController


class _FakeRunner:
    def run(self, cfg: RunConfig) -> RunResult:
        rid = cfg.resolved_run_id()
        pieces = [
            ContentPiece(
                run_id=rid,
                trend="trend-a",
                angle="angle-1",
                platform="twitter",
                variation_number=1,
                body="Hook line\nBody text",
                creative_brief="static image",
                predicted_score=92,
                score_reasoning="Strong hook.",
                recommended=True,
            ),
            ContentPiece(
                run_id=rid,
                trend="trend-b",
                angle="angle-2",
                platform="linkedin",
                variation_number=1,
                body="Another hook\nMore body",
                creative_brief="carousel",
                predicted_score=40,
                score_reasoning="Weaker clarity.",
                recommended=False,
            ),
        ]
        return RunResult(
            success=True,
            run_id=rid,
            pieces=pieces,
            summary=RunSummary(total_pieces=len(pieces)),
        )


def test_controller_writes_json(tmp_path: Path) -> None:
    ctrl = PipelineController(runner=_FakeRunner(), output_dir=tmp_path)
    cfg = RunConfig(niche="AI SaaS")
    result = ctrl.run(cfg)
    assert result.success
    out_file = tmp_path / f"{result.run_id}.json"
    assert out_file.exists()
    assert out_file.read_text(encoding="utf-8").count("trend-a") >= 1


def test_run_config_defaults() -> None:
    rc = RunConfig(niche="test")
    assert rc.variations == 2
    assert "twitter" in rc.platforms


def test_default_subreddit_fallback_is_niche_agnostic() -> None:
    assert default_subreddit_csv("vertical-a") == default_subreddit_csv("vertical-b")

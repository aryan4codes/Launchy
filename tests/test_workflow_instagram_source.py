"""Workflow source.instagram handler."""

from __future__ import annotations

from pathlib import Path

import pytest

from workflow.context import NodeExecContext
from workflow.node_handlers import run_handler
from workflow.schema import NodeSpec, WorkflowSpec


def _ctx(
    *,
    workflow_inputs: dict,
    params: dict | None = None,
) -> NodeExecContext:
    return NodeExecContext(
        run_id="r1",
        workflow_inputs=workflow_inputs,
        upstream_outputs={},
        completed_outputs={},
        node=NodeSpec(id="instagram", type="source.instagram", params=params or {}),
        outputs_base=Path("."),
        memory_collection=None,
    )


def test_instagram_calls_tool_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, int]] = []

    def fake_run(**kwargs):
        calls.append((kwargs["hashtags"], int(kwargs["result_limit"])))
        return (
            "### Instagram hashtag signals (posts)\nActor: test\nHashtags: a, b\n"
            "- (1 likes / 0 comments) x :: https://example.com/p/1/"
        )

    monkeypatch.setattr(
        "workflow.node_handlers.instagram_trend_signals",
        type("T", (), {"run": staticmethod(fake_run)})(),
    )

    out = run_handler(
        "source.instagram",
        _ctx(workflow_inputs={"topic": "AI SaaS", "instagram_hashtags": "foo,bar"}),
        {"result_limit": 7},
    )
    assert calls == [("foo,bar", 7)]
    assert "instagram hashtag signals" in out["text"].lower()
    assert out["hashtags"] == "foo,bar"


def test_instagram_respects_topic_only_hashtags(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_run(**kwargs):
        assert kwargs["hashtags"] == "AI,SaaS"
        assert kwargs["result_limit"] == 12
        return "### Instagram hashtag signals (posts)\nActor: x\nHashtags: AI, Saaas\n"

    monkeypatch.setattr(
        "workflow.node_handlers.instagram_trend_signals",
        type("T", (), {"run": staticmethod(fake_run)})(),
    )

    out = run_handler(
        "source.instagram",
        _ctx(workflow_inputs={"topic": "AI SaaS"}),
        {},
    )
    assert "instagram hashtag signals" in out["text"].lower()


def test_launchy_templates_include_instagram_node() -> None:
    root = Path(__file__).resolve().parent.parent / "workflows" / "templates"
    for name in ("launchy_virality_plus_images.json", "avcm_classic.json"):
        spec = WorkflowSpec.model_validate_json((root / name).read_text(encoding="utf-8"))
        types = {n.type for n in spec.nodes}
        ids = {n.id for n in spec.nodes}
        assert "source.instagram" in types
        assert "instagram" in ids

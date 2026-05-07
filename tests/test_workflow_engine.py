"""Workflow engine DAG validation and mocked execution."""

from __future__ import annotations

from pathlib import Path

import pytest

from workflow.engine import WorkflowEngine, _detect_cycle, topological_levels, topological_order
from workflow.schema import EdgeSpec, NodeSpec, WorkflowSpec


def _tiny_linear() -> WorkflowSpec:
    return WorkflowSpec(
        name="lin",
        nodes=[
            NodeSpec(id="a", type="trigger.input", params={}),
            NodeSpec(id="b", type="trigger.input", params={}),
            NodeSpec(id="c", type="trigger.input", params={}),
        ],
        edges=[
            EdgeSpec(source="a", target="b"),
            EdgeSpec(source="b", target="c"),
        ],
    )


def test_topological_order_respects_dependency_chain() -> None:
    wf = _tiny_linear()
    assert topological_order(wf.nodes, wf.edges) == ["a", "b", "c"]


def test_topological_levels_parallel_branches() -> None:
    wf = WorkflowSpec(
        name="dia",
        nodes=[
            NodeSpec(id="a", type="trigger.input", params={}),
            NodeSpec(id="b", type="trigger.input", params={}),
            NodeSpec(id="c", type="trigger.input", params={}),
            NodeSpec(id="d", type="trigger.input", params={}),
        ],
        edges=[
            EdgeSpec(source="a", target="b"),
            EdgeSpec(source="a", target="c"),
            EdgeSpec(source="b", target="d"),
            EdgeSpec(source="c", target="d"),
        ],
    )
    assert topological_levels(wf.nodes, wf.edges) == [["a"], ["b", "c"], ["d"]]


def test_cycle_detection_true() -> None:
    wf = WorkflowSpec(
        name="cyc",
        nodes=[
            NodeSpec(id="x", type="trigger.input"),
            NodeSpec(id="y", type="trigger.input"),
        ],
        edges=[EdgeSpec(source="x", target="y"), EdgeSpec(source="y", target="x")],
    )
    assert _detect_cycle(wf.nodes, wf.edges) is True


def test_engine_runs_mocked_handlers_in_topo_order(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    wf = _tiny_linear()
    order: list[str] = []

    def patched_get_handler(t: str):
        def runner(ctx: object, p: dict):
            order.append(ctx.node.id)  # type: ignore[attr-defined]
            return {"kind": t, "nid": getattr(ctx.node, "id", "")}

        return runner

    monkeypatch.setattr("workflow.engine.get_handler", patched_get_handler)
    engine = WorkflowEngine(output_root=tmp_path, hub=None, use_memory=False)

    import asyncio

    asyncio.run(engine.execute(wf, "run-linear", {"niche": "test"}))

    assert order == ["a", "b", "c"]
    meta = (tmp_path / "run-linear" / "workflow_run.json").read_text(encoding="utf-8")
    assert '"status": "completed"' in meta


def test_engine_rejects_cycles_before_run(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    wf = WorkflowSpec(
        name="bad",
        nodes=[
            NodeSpec(id="x", type="trigger.input"),
            NodeSpec(id="y", type="trigger.input"),
        ],
        edges=[EdgeSpec(source="x", target="y"), EdgeSpec(source="y", target="x")],
    )

    monkeypatch.setattr(
        "workflow.engine.get_handler",
        lambda t: lambda ctx, p: {},
    )
    engine = WorkflowEngine(output_root=tmp_path, hub=None, use_memory=False)

    import asyncio

    with pytest.raises(ValueError, match="cycle"):
        asyncio.run(engine.execute(wf, "run-bad", {}))

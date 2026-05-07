"""DAG validation, topological execution, filesystem artifacts, and WS events."""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

from memory.chroma_client import get_performance_collection
from workflow.context import NodeExecContext
from workflow.node_handlers import schemas_by_type
from workflow.registry import get_handler
from workflow.run_hub import WorkflowRunHub
from workflow.schema import NodeSpec, RunEvent, RunStatus, WorkflowSpec

_LOG = logging.getLogger(__name__)


def _detect_cycle(nodes: list[NodeSpec], edges: list) -> bool:
    node_ids = {n.id for n in nodes}
    adj: dict[str, list[str]] = defaultdict(list)
    for e in edges:
        if e.source not in node_ids or e.target not in node_ids:
            continue
        adj[e.source].append(e.target)

    WHITE, GRAY, BLACK = 0, 1, 2
    color: dict[str, int] = {nid: WHITE for nid in node_ids}

    def dfs(u: str) -> bool:
        color[u] = GRAY
        for v in adj[u]:
            if color[v] == GRAY:
                return True
            if color[v] == WHITE and dfs(v):
                return True
        color[u] = BLACK
        return False

    for nid in node_ids:
        if color[nid] == WHITE and dfs(nid):
            return True
    return False


def topological_order(nodes: list[NodeSpec], edges: list) -> list[str]:
    node_ids = [n.id for n in nodes]
    known = set(node_ids)
    indeg: dict[str, int] = {nid: 0 for nid in node_ids}
    adj: dict[str, list[str]] = defaultdict(list)
    for e in edges:
        if e.source not in known or e.target not in known:
            continue
        adj[e.source].append(e.target)
        indeg[e.target] += 1

    q = deque([n for n in node_ids if indeg[n] == 0])
    out: list[str] = []
    while q:
        u = q.popleft()
        out.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    if len(out) != len(node_ids):
        raise ValueError("Workflow graph has a cycle or broken edge endpoints.")
    return out


def topological_levels(nodes: list[NodeSpec], edges: list) -> list[list[str]]:
    """Partition nodes into levels: each level can run in parallel (all deps in earlier levels)."""
    node_ids = [n.id for n in nodes]
    known = set(node_ids)
    preds: dict[str, list[str]] = defaultdict(list)
    for e in edges:
        if e.source not in known or e.target not in known:
            continue
        preds[e.target].append(e.source)

    remaining = set(node_ids)
    completed: set[str] = set()
    levels: list[list[str]] = []
    while remaining:
        ready = [nid for nid in node_ids if nid in remaining and all(p in completed for p in preds[nid])]
        if not ready:
            raise ValueError("Workflow graph has a cycle or broken edge endpoints.")
        levels.append(ready)
        for nid in ready:
            remaining.remove(nid)
            completed.add(nid)
    return levels


def _validate_node_types(spec: WorkflowSpec) -> None:
    known = set(schemas_by_type().keys())
    for n in spec.nodes:
        if n.type not in known:
            raise ValueError(f"Unknown node type '{n.type}' on node '{n.id}'.")


class WorkflowEngine:
    """Runs a DAG, persists per-node JSON, emits ``RunEvent`` to ``hub`` when set."""

    def __init__(
        self,
        *,
        output_root: Path | None = None,
        hub: WorkflowRunHub | None = None,
        use_memory: bool = True,
    ) -> None:
        self.output_root = output_root or Path("outputs")
        self.hub = hub
        self.use_memory = use_memory
        self._current_run_dir: Path | None = None

    async def _emit(self, run_id: str, event: RunEvent) -> None:
        if self._current_run_dir is not None:
            ef = self._current_run_dir / "events.jsonl"
            ef.parent.mkdir(parents=True, exist_ok=True)
            with ef.open("a", encoding="utf-8") as f:
                f.write(event.model_dump_json() + "\n")
        if self.hub is None:
            return
        await self.hub.emit(run_id, event)

    def _write_node_artifact(self, run_dir: Path, node_id: str, payload: dict[str, Any]) -> None:
        nodes_dir = run_dir / "nodes"
        nodes_dir.mkdir(parents=True, exist_ok=True)
        (nodes_dir / f"{node_id}.json").write_text(
            json.dumps(payload, indent=2, default=str),
            encoding="utf-8",
        )

    def _write_meta(
        self,
        run_dir: Path,
        *,
        run_id: str,
        status: RunStatus,
        spec: WorkflowSpec,
        inputs: dict[str, Any],
        node_outputs: dict[str, dict[str, Any]],
        final_output: dict[str, Any] | None,
        error: str | None,
    ) -> None:
        meta = {
            "run_id": run_id,
            "status": status.value,
            "workflow": spec.model_dump(by_alias=True, mode="json"),
            "inputs": inputs,
            "node_outputs": node_outputs,
            "final_output": final_output,
            "error": error,
        }
        (run_dir / "workflow_run.json").write_text(
            json.dumps(meta, indent=2, default=str),
            encoding="utf-8",
        )

    async def execute(self, spec: WorkflowSpec, run_id: str, inputs: dict[str, Any]) -> dict[str, Any]:
        _validate_node_types(spec)
        if _detect_cycle(spec.nodes, spec.edges):
            raise ValueError("Workflow contains a cycle.")
        levels = topological_levels(spec.nodes, spec.edges)
        order = [nid for tier in levels for nid in tier]

        run_dir = self.output_root / run_id
        self._current_run_dir = run_dir
        run_dir.mkdir(parents=True, exist_ok=True)

        node_by_id = {n.id: n for n in spec.nodes}
        preds: dict[str, list[str]] = defaultdict(list)
        for e in spec.edges:
            preds[e.target].append(e.source)

        outputs: dict[str, dict[str, Any]] = {}
        collection = None
        if self.use_memory:
            try:
                collection = get_performance_collection()
            except Exception as e:
                _LOG.warning("Chroma memory unavailable for workflow: %s", e)

        await self._emit(
            run_id,
            RunEvent(type="run_started", run_id=run_id, payload={"order": order}),
        )
        self._write_meta(
            run_dir,
            run_id=run_id,
            status=RunStatus.running,
            spec=spec,
            inputs=inputs,
            node_outputs={},
            final_output=None,
            error=None,
        )

        final_payload: dict[str, Any] | None = None
        err: str | None = None

        try:
            for level in levels:
                id_rank = {nid: i for i, nid in enumerate(order)}

                async def _run_one(nid: str) -> tuple[str, dict[str, Any]]:
                    node = node_by_id[nid]
                    upstream = {p: outputs[p] for p in preds[nid] if p in outputs}
                    ctx = NodeExecContext(
                        run_id=run_id,
                        workflow_inputs=inputs,
                        upstream_outputs=upstream,
                        completed_outputs=dict(outputs),
                        node=node,
                        outputs_base=run_dir,
                        memory_collection=collection,
                    )
                    await self._emit(
                        run_id,
                        RunEvent(type="node_started", run_id=run_id, node_id=nid, payload={}),
                    )
                    handler = get_handler(node.type)

                    def _sync_call() -> dict[str, Any]:
                        return handler(ctx, dict(node.params))

                    try:
                        out = await asyncio.to_thread(_sync_call)
                    except Exception as exc:
                        err_s = str(exc)
                        await self._emit(
                            run_id,
                            RunEvent(
                                type="node_failed",
                                run_id=run_id,
                                node_id=nid,
                                payload={"error": err_s},
                            ),
                        )
                        self._write_node_artifact(
                            run_dir,
                            nid,
                            {"node_id": nid, "type": node.type, "error": err_s, "output": None},
                        )
                        raise

                    self._write_node_artifact(
                        run_dir,
                        nid,
                        {"node_id": nid, "type": node.type, "error": None, "output": out},
                    )
                    await self._emit(
                        run_id,
                        RunEvent(
                            type="node_finished",
                            run_id=run_id,
                            node_id=nid,
                            payload={"output": out},
                        ),
                    )
                    return nid, out

                tier = sorted(level, key=lambda x: id_rank[x])
                results = await asyncio.gather(
                    *(_run_one(nid) for nid in tier),
                    return_exceptions=True,
                )
                for nid, res in zip(tier, results):
                    if isinstance(res, Exception):
                        err = str(res)
                        await self._emit(
                            run_id,
                            RunEvent(
                                type="run_finished",
                                run_id=run_id,
                                payload={"error": err, "failed_node": nid},
                            ),
                        )
                        self._write_meta(
                            run_dir,
                            run_id=run_id,
                            status=RunStatus.failed,
                            spec=spec,
                            inputs=inputs,
                            node_outputs=outputs,
                            final_output=None,
                            error=err,
                        )
                        raise res
                    finished_id, out = res
                    outputs[finished_id] = out
                    node = node_by_id[finished_id]
                    if node.type == "output.pieces":
                        final_payload = out

            if final_payload is None:
                final_payload = {"nodes": outputs}

            await self._emit(
                run_id,
                RunEvent(
                    type="run_finished",
                    run_id=run_id,
                    payload={"final_output": final_payload},
                ),
            )
            self._write_meta(
                run_dir,
                run_id=run_id,
                status=RunStatus.completed,
                spec=spec,
                inputs=inputs,
                node_outputs=outputs,
                final_output=final_payload,
                error=None,
            )
            return final_payload

        except Exception:
            if err is None:
                self._write_meta(
                    run_dir,
                    run_id=run_id,
                    status=RunStatus.failed,
                    spec=spec,
                    inputs=inputs,
                    node_outputs=outputs,
                    final_output=final_payload,
                    error="failed",
                )
            raise
        finally:
            self._current_run_dir = None

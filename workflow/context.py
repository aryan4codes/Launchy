"""Per-node execution context passed to handlers."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from chromadb.api.models.Collection import Collection

from workflow.schema import NodeSpec


@dataclass(slots=True)
class NodeExecContext:
    run_id: str
    workflow_inputs: dict[str, Any]
    upstream_outputs: dict[str, dict[str, Any]]
    """Direct predecessor outputs keyed by predecessor node id."""

    completed_outputs: dict[str, dict[str, Any]]
    """All completed node outputs before the current node runs."""

    node: NodeSpec
    outputs_base: Path
    memory_collection: Collection | None

"""Registered node kinds and JSON Schema map for the canvas UI."""

from __future__ import annotations

from typing import Any, Callable, Protocol, runtime_checkable

from workflow.context import NodeExecContext
from workflow.node_handlers import run_handler, schemas_by_type


@runtime_checkable
class NodeHandler(Protocol):
    def __call__(self, ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]: ...


def get_handler(node_type: str) -> Callable[[NodeExecContext, dict[str, Any]], dict[str, Any]]:
    if node_type not in HANDLERS:
        raise ValueError(f"unknown node type: {node_type}")

    def _inner(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
        return run_handler(node_type, ctx, params)

    return _inner


def handler_params_schema(node_type: str) -> dict[str, Any]:
    schemas = HANDLERS
    if node_type not in schemas:
        raise ValueError(f"unknown node type: {node_type}")
    return schemas[node_type]


def get_node_type_schemas() -> dict[str, dict[str, Any]]:
    base = schemas_by_type()
    return {
        kind: {"$schema": "https://json-schema.org/draft/2020-12/schema", **schema}
        for kind, schema in base.items()
    }


HANDLERS: dict[str, dict[str, Any]] = schemas_by_type()
"""Parameter JSON Schema per node kind (executable handlers live in ``node_handlers``)."""

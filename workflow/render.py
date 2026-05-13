"""Shared Jinja2 rendering for workflow node params."""

from __future__ import annotations

import json
from typing import Any

from jinja2 import Environment, StrictUndefined


def _pretty(obj: Any) -> str:
    try:
        return json.dumps(obj, indent=2, default=str)
    except TypeError:
        return repr(obj)


def render_template(template_str: str, context: dict[str, Any]) -> str:
    env = Environment(undefined=StrictUndefined, autoescape=False)
    env.filters["pretty"] = _pretty
    env.filters["json"] = lambda o: json.dumps(o, default=str)
    tmpl = env.from_string(template_str)
    return tmpl.render(**context)


def merge_context(workflow_inputs: dict[str, Any], upstream_outputs: dict[str, Any]) -> dict[str, Any]:
    """Flatten workflow inputs plus per-node upstream outputs for templates."""

    base: dict[str, Any] = {
        **workflow_inputs,
        "upstream": upstream_outputs,
        "nodes": upstream_outputs,
    }
    voice_data: dict[str, Any] | None = None
    for _, out in upstream_outputs.items():
        if isinstance(out, dict) and "voice_block" in out:
            voice_data = out
            break
    if voice_data is not None:
        base["voice"] = voice_data
    return base

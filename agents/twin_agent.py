"""OpenAI tool loop + streamed token emission for Twin chat."""

from __future__ import annotations

import json
import logging
import os
from collections.abc import AsyncIterator
from typing import Any

from openai import AsyncOpenAI

from twin.session import append_message, read_messages
from tools.twin_tools import (
    TwinToolContext,
    execute_twin_tool,
    get_memory_collection_safe,
    openai_tool_schemas,
)

_LOG = logging.getLogger(__name__)

_MAX_AGENT_STEPS = 8


def _system_prompt(ctx: TwinToolContext) -> str:
    flags = []
    flags.append(f"memory_tool={'on' if ctx.tool_memory else 'off'}")
    flags.append(f"research_tools={'on' if ctx.tool_research else 'off'}")
    flags.append(f"workflow_runs={'on' if ctx.tool_workflow else 'off'}")
    voice_hint = ""
    if ctx.voice_profile_id:
        voice_hint = f"Active voice_profile_id={ctx.voice_profile_id}. Call get_voice_profile when writing or rewriting in-voice.\n"
    return (
        "You are Launchy's Digital Twin — the creator's always-on creative partner. "
        "Be concise, opinionated, and practical. Prefer tools over guessing facts. "
        "When the user wants a **full campaign** or multi-step Launchy DAG, call start_workflow_run with a concrete "
        "template_id and inputs_json (include at least {\"topic\":\"...\"} or keys that template expects). "
        "For quick single posts, draft_post may be enough. "
        "Use query_memory before claiming what performed well historically.\n\n"
        f"{voice_hint}"
        f"Tool gating this session: {', '.join(flags)}."
    )


def _sanitize_openai_turn(m: dict[str, Any]) -> dict[str, Any] | None:
    role = m.get("role")
    if role not in ("user", "assistant", "tool", "system"):
        return None
    out: dict[str, Any] = {"role": role}
    if m.get("content") is not None and m.get("content") != "":
        out["content"] = m["content"]
    if m.get("name"):
        out["name"] = m["name"]
    if m.get("tool_call_id"):
        out["tool_call_id"] = m["tool_call_id"]
    if m.get("tool_calls"):
        out["tool_calls"] = m["tool_calls"]
    return out


def build_openai_history(session_id: str) -> list[dict[str, Any]]:
    rows = read_messages(session_id, max_turns=200)
    out: list[dict[str, Any]] = []
    for r in rows:
        s = _sanitize_openai_turn(r)
        if s:
            out.append(s)
    return out


def _chunk_text(text: str, size: int = 32) -> list[str]:
    return [text[i : i + size] for i in range(0, len(text), size)] or [""]


async def stream_twin_turn(
    *,
    session_id: str,
    twin_ctx: TwinToolContext,
) -> AsyncIterator[dict[str, Any]]:
    """Consumes persisted chat (including latest user message) and yields SSE payloads."""
    model = os.environ.get("TWIN_MODEL", os.environ.get("OPENAI_MODEL", "gpt-4.1-nano"))
    client = AsyncOpenAI()
    collection = get_memory_collection_safe()

    msgs: list[dict[str, Any]] = [{"role": "system", "content": _system_prompt(twin_ctx)}]
    msgs.extend(build_openai_history(session_id))

    schemas = openai_tool_schemas(twin_ctx)

    for step in range(_MAX_AGENT_STEPS):
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=msgs,
                tools=schemas if schemas else None,
                tool_choice="auto" if schemas else None,
                temperature=0.7,
            )
        except Exception as e:
            _LOG.exception("Twin OpenAI call failed")
            yield {"type": "error", "message": str(e)}
            yield {"type": "done"}
            return

        choice = resp.choices[0].message

        tool_calls = choice.tool_calls
        if tool_calls:
            assistant_record: dict[str, Any] = {
                "role": "assistant",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments or "{}",
                        },
                    }
                    for tc in tool_calls
                ],
            }
            if choice.content:
                assistant_record["content"] = choice.content
            append_message(session_id, assistant_record)
            msgs.append(assistant_record)

            for tc in tool_calls:
                fn = tc.function.name
                raw_args = tc.function.arguments or "{}"
                try:
                    args_preview = json.loads(raw_args or "{}")
                except json.JSONDecodeError:
                    args_preview = {}
                yield {"type": "tool_call", "name": fn, "args": args_preview}

                summary, action = await execute_twin_tool(
                    fn, raw_args, ctx=twin_ctx, collection=collection
                )

                if action:
                    yield action
                preview = summary if len(summary) <= 2400 else summary[:2397] + "..."
                yield {"type": "tool_result", "name": fn, "summary": preview}

                tool_row = {"role": "tool", "tool_call_id": tc.id, "content": summary}
                append_message(session_id, tool_row)
                msgs.append(tool_row)
            continue

        content = choice.content or ""
        append_message(session_id, {"role": "assistant", "content": content})
        for delta in _chunk_text(content):
            yield {"type": "token", "delta": delta}
        yield {"type": "done"}
        return

    yield {
        "type": "error",
        "message": f"Twin stopped after {_MAX_AGENT_STEPS} planner steps without a final answer.",
    }
    yield {"type": "done"}

"""Twin chat tool implementations (memory, research, voice, workflows, drafts)."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from chromadb.api.models.Collection import Collection
from crewai_tools import SerperDevTool

from http_api.deps import workflow_hub_singleton
from http_api.workflow_storage import load_template
from memory.chroma_client import get_performance_collection
from memory.mongo_context import mongodb_configured, search_voice_context
from tools.memory_query import build_memory_query_tool
from tools.reddit_tool import reddit_top_signals
from voice.store import load_profile as load_voice_profile
from workflow.engine import WorkflowEngine

_LOG = logging.getLogger(__name__)


@dataclass
class TwinToolContext:
    voice_profile_id: str | None
    tool_memory: bool = True
    tool_research: bool = True
    tool_workflow: bool = True
    tool_mongodb: bool = True


def openai_tool_schemas(ctx: TwinToolContext) -> list[dict[str, Any]]:
    tools: list[dict[str, Any]] = [
        {
            "type": "function",
            "function": {
                "name": "get_voice_profile",
                "description": "Return the active creator voice profile summary block for style-matched writing.",
                "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "draft_post",
                "description": "Write one short post in the creator's voice without running the full campaign pipeline.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "topic": {"type": "string", "description": "What the post is about."},
                        "platform": {
                            "type": "string",
                            "description": "Target platform hint, e.g. twitter, linkedin, instagram.",
                            "default": "twitter",
                        },
                    },
                    "required": ["topic"],
                    "additionalProperties": False,
                },
            },
        },
    ]
    # List Mongo creator-knowledge before Chroma memory so the planner favors training samples for idea brainstorms.
    if ctx.tool_mongodb and mongodb_configured():
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": "query_creator_knowledge",
                    "description": (
                        "**Primary tool for this creator’s own content signals:** reel captions & transcripts, "
                        "example hooks, vocabulary, DO/DON'T from Voice training (MongoDB). "
                        "Use for **next reel/post topics**, hooks, angles, themes—especially when the user asks "
                        "what to make next or how to stay on-brand. Call with 1–3 searches (e.g. `reel topics hooks`, "
                        "`themes transcript`, niche keywords). **Prefer over query_memory** unless they ask what "
                        "**scored well in past Launchy runs**."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search phrase (topics, hooks, niche, product area).",
                            },
                        },
                        "required": ["query"],
                        "additionalProperties": False,
                    },
                },
            }
        )
    if ctx.tool_memory:
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": "query_memory",
                    "description": (
                        "Semantic search **Launchy performance-scored** content stored in Chroma—not Instagram/Voice "
                        "training data. Use when the user asks what **performed well historically** in Launchy. "
                        "Do **not** use as the main source for reel topic brainstorms (use query_creator_knowledge)."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {"query": {"type": "string"}},
                        "required": ["query"],
                        "additionalProperties": False,
                    },
                },
            }
        )
    if ctx.tool_research:
        tools.extend(
            [
                {
                    "type": "function",
                    "function": {
                        "name": "research_reddit",
                        "description": "Fetch hot posts from comma-separated subreddits (no r/ prefix).",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "subreddits": {"type": "string"},
                                "limit": {"type": "integer", "default": 12},
                            },
                            "required": ["subreddits"],
                            "additionalProperties": False,
                        },
                    },
                },
                {
                    "type": "function",
                    "function": {
                        "name": "research_web",
                        "description": (
                            "Live Google web/news search via Serper for **recent public context**: headlines, "
                            "product releases, trends, stats, fact-checking. Use when the question needs "
                            "information beyond the creator profile or training cutoff—not for the creator's "
                            "private voice (use query_creator_knowledge / voice profile). "
                            "Requires SERPER_API_KEY."
                        ),
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "Focused search query; include year or “latest” when recency matters.",
                                },
                                "mode": {
                                    "type": "string",
                                    "enum": ["web", "news"],
                                    "default": "web",
                                    "description": (
                                        "Use \"news\" for timely headlines and breaking stories; "
                                        "\"web\" for general organic results."
                                    ),
                                },
                            },
                            "required": ["query"],
                            "additionalProperties": False,
                        },
                    },
                },
            ]
        )
    if ctx.tool_workflow:
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": "start_workflow_run",
                    "description": (
                        "Start an async workflow template run (DAG). Use for full campaigns. "
                        "Templates live under workflows/templates — e.g. avcm_classic, saas_launch, launchy_with_voice."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "template_id": {"type": "string"},
                            "inputs_json": {
                                "type": "string",
                                "description": "JSON object string of workflow inputs, e.g. {\"topic\":\"AI SaaS\"}",
                            },
                        },
                        "required": ["template_id"],
                        "additionalProperties": False,
                    },
                },
            }
        )
    tools.append(
        {
            "type": "function",
            "function": {
                "name": "recall_past_runs",
                "description": "List recent classic or workflow run IDs under outputs/.",
                "parameters": {
                    "type": "object",
                    "properties": {"n": {"type": "integer", "default": 5}},
                    "additionalProperties": False,
                },
            },
        }
    )
    return tools


def _invoke_tool_like(tool: object, kwargs: dict[str, Any]) -> str:
    run = getattr(tool, "run", None)
    if callable(run):
        try:
            out = run(**kwargs)
        except TypeError:
            if len(kwargs) == 1:
                out = run(next(iter(kwargs.values())))
            else:
                raise
        content = getattr(out, "content", None)
        return content if isinstance(content, str) else (out if isinstance(out, str) else str(out))
    raise TypeError(f"No run() on {type(tool)!r}")


def _get_voice_block(ctx: TwinToolContext) -> str:
    if not ctx.voice_profile_id:
        return "No voice profile is set for this chat. Use neutral platform-native tone."
    try:
        p = load_voice_profile(ctx.voice_profile_id)
        block = p.summary_block
        ds = getattr(p, "delivery_style", None)
        if isinstance(ds, str) and ds.strip():
            block = f"{block}\n\n— On-camera / spoken delivery —\n{ds.strip()}"
        return block
    except Exception as e:
        _LOG.warning("voice load failed: %s", e)
        return "Voice profile missing or unreadable; use neutral tone."


def recall_past_runs(n: int = 5) -> str:
    root = Path("outputs")
    if not root.is_dir():
        return "No outputs directory yet."
    rows: list[str] = []
    for p in sorted(root.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if p.name == "twin_sessions":
            continue
        if p.is_dir() and (p / "workflow_run.json").exists():
            rows.append(f"workflow DAG: {p.name} -> /results/{p.name}")
        elif p.is_file() and p.suffix == ".json" and p.name != "events.jsonl":
            rows.append(f"classic run: {p.stem} -> /runs/{p.stem}")
        if len(rows) >= max(1, min(n, 20)):
            break
    return "\n".join(rows) if rows else "No prior runs found."


async def execute_twin_tool(
    name: str,
    raw_args: str | None,
    *,
    ctx: TwinToolContext,
    collection: Collection | None,
) -> tuple[str, dict[str, Any] | None]:
    """Returns (tool message text for the model, optional SSE action payload)."""
    try:
        args: dict[str, Any] = json.loads(raw_args or "{}")
    except json.JSONDecodeError:
        return "Invalid JSON arguments for tool.", None

    if name == "get_voice_profile":
        return _get_voice_block(ctx), None

    if name == "draft_post":
        topic = str(args.get("topic", "")).strip()
        platform = str(args.get("platform", "twitter")).strip() or "twitter"
        if not topic:
            return "Topic is required.", None
        voice = _get_voice_block(ctx)
        try:
            from openai import OpenAI

            client = OpenAI()
            model = os.environ.get("TWIN_MODEL", os.environ.get("OPENAI_MODEL", "gpt-4.1-nano"))
            sys = (
                "You are the creator's Digital Twin. Write exactly one post. "
                "Match the voice profile below. No hashtags unless natural. No fake metrics.\n\n"
                f"VOICE PROFILE:\n{voice}"
            )
            user = f"Platform hint: {platform}\nTopic:\n{topic}"
            out = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": sys},
                    {"role": "user", "content": user},
                ],
            )
            text = (out.choices[0].message.content or "").strip()
            return text or "(empty draft)", None
        except Exception as e:
            return f"draft_post failed: {e}", None

    if name == "query_creator_knowledge":
        if not ctx.tool_mongodb:
            return "MongoDB knowledge tool is disabled for this session.", None
        if not mongodb_configured():
            return "MongoDB is not configured on the server (MONGODB_URI).", None
        if not ctx.voice_profile_id:
            return "No voice profile on this chat — select one to search creator knowledge.", None
        q = str(args.get("query", "")).strip()
        if not q:
            return "query is required.", None

        def _run() -> str:
            return search_voice_context(ctx.voice_profile_id, q)

        return await asyncio.to_thread(_run), None

    if name == "query_memory":
        if not ctx.tool_memory:
            return "Memory tool is disabled for this session.", None
        if collection is None:
            return "Memory database is not available.", None
        q = str(args.get("query", "")).strip()
        if not q:
            return "Query is required.", None
        tool = build_memory_query_tool(collection, 8)

        def _run() -> str:
            return str(_invoke_tool_like(tool, {"topic_and_hook": q}))

        return await asyncio.to_thread(_run), None

    if name == "research_reddit":
        if not ctx.tool_research:
            return "Research tools are disabled for this session.", None
        subs = str(args.get("subreddits", "")).strip()
        if not subs:
            return "subreddits is required (comma-separated).", None
        limit = int(args.get("limit", 12) or 12)

        def _run() -> str:
            return str(_invoke_tool_like(reddit_top_signals, {"subreddits": subs, "limit": limit}))

        return await asyncio.to_thread(_run), None

    if name == "research_web":
        if not ctx.tool_research:
            return "Research tools are disabled for this session.", None
        q = str(args.get("query", "")).strip()
        if not q:
            return "query is required.", None
        if not (os.getenv("SERPER_API_KEY") or "").strip():
            return (
                "Web search is unavailable: set SERPER_API_KEY on the Launchy API server (.env), then retry.",
                None,
            )
        mode = str(args.get("mode", "web") or "web").strip().lower()
        search_type = "news" if mode == "news" else "search"

        def _run() -> str:
            serp = SerperDevTool()
            raw = _invoke_tool_like(serp, {"search_query": q, "search_type": search_type})
            return raw if isinstance(raw, str) else json.dumps(raw, default=str)

        return await asyncio.to_thread(_run), None

    if name == "start_workflow_run":
        if not ctx.tool_workflow:
            return "Workflow runs are disabled for this session.", None
        tid = str(args.get("template_id", "")).strip()
        if not tid:
            return "template_id is required.", None
        raw_in = args.get("inputs_json") or "{}"
        try:
            inputs = json.loads(raw_in) if isinstance(raw_in, str) else dict(raw_in)
        except json.JSONDecodeError:
            return "inputs_json must be valid JSON object string.", None
        try:
            spec = load_template(tid)
        except FileNotFoundError:
            return f"Unknown template_id: {tid}", None
        run_id = str(uuid.uuid4())
        hub = workflow_hub_singleton()
        engine = WorkflowEngine(hub=hub, use_memory=True)

        async def _runner() -> None:
            try:
                await engine.execute(spec, run_id, inputs)
            except Exception:
                _LOG.exception("twin workflow run failed")

        asyncio.create_task(_runner())
        action = {
            "type": "action",
            "kind": "workflow_run_started",
            "run_id": run_id,
            "template_id": tid,
            "results_url": f"/results/{run_id}",
        }
        msg = (
            f"Started workflow template '{tid}' as run_id={run_id}. "
            f"Poll /workflow-runs/{run_id} or open results at /results/{run_id}."
        )
        return msg, action

    if name == "recall_past_runs":
        n = int(args.get("n", 5) or 5)
        return await asyncio.to_thread(recall_past_runs, n), None

    return f"Unknown tool: {name}", None


def get_memory_collection_safe() -> Collection | None:
    try:
        return get_performance_collection()
    except Exception as e:
        _LOG.warning("Chroma unavailable for twin: %s", e)
        return None

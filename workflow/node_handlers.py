"""Registered node implementations (sync; engine offloads with asyncio.to_thread)."""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any

from tools.memory_query import build_memory_query_tool
from tools.memory_write import build_memory_write_tool
from tools.instagram_apify_tool import (
    fetch_instagram_creator_posts_markdown,
    instagram_trend_signals,
)
from tools.reddit_tool import reddit_top_signals
from workflow.context import NodeExecContext
from workflow.nodes.openai_image_node import run_openai_image_node
from workflow.render import merge_context, render_template
from workflow.schema import (
    CampaignResult,
    CrewAIParams,
    OpenAIImageParams,
    MemoryQueryParams,
    MemoryWriteParams,
    OutputPiecesParams,
    InstagramSourceParams,
    RedditSourceParams,
    ScrapeURLParams,
    SerperSourceParams,
    TransformTemplateParams,
    TriggerInputParams,
    VoiceLoadParams,
)

from voice.store import load_profile as load_voice_profile

_LOG = logging.getLogger(__name__)


def _invoke_tool_like(tool: object, kwargs: dict[str, Any]) -> str | Any:
    run = getattr(tool, "run", None)
    if callable(run):
        try:
            out = run(**kwargs)
            content = getattr(out, "content", None)
            if content is not None:
                return content
            return out if isinstance(out, str) else out
        except TypeError:
            if len(kwargs) == 1:
                only = next(iter(kwargs.values()))
                out = run(only)
                content = getattr(out, "content", None)
                if content is not None:
                    return content
                return out if isinstance(out, str) else out
    invoke = getattr(tool, "invoke", None)
    if callable(invoke):
        return invoke(kwargs)
    _run = getattr(tool, "_run", None)
    if callable(_run):
        return _run(**kwargs)
    raise TypeError(f"No invokable run/invoke/_run on {type(tool)!r}")


def handler_voice_load(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = VoiceLoadParams.model_validate(params)
    try:
        prof = load_voice_profile(p.profile_id.strip())
    except FileNotFoundError as e:
        raise RuntimeError(f"Voice profile not found: {p.profile_id}") from e
    return {
        "voice_block": prof.summary_block,
        "profile_id": prof.profile_id,
        "creator_name": prof.creator_name,
        "tone_descriptors": prof.tone_descriptors,
        "do_list": prof.do_list,
        "dont_list": prof.dont_list,
        "example_hooks": prof.example_hooks,
        "sample_count": prof.sample_count,
    }


def _run_crewai_single_task(ctx: NodeExecContext, p: CrewAIParams) -> dict[str, Any]:
    template_ctx = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    task_desc = render_template(p.task_description_template, template_ctx)
    exp_out = render_template(p.expected_output, template_ctx)
    model = os.environ.get("OPENAI_MODEL", "gpt-4.1-nano")

    from crewai import Agent, Crew, Process, Task

    agent = Agent(
        role=p.role,
        goal=p.goal,
        backstory=p.backstory,
        tools=[],
        llm=model,
        verbose=False,
    )
    task = Task(description=task_desc, expected_output=exp_out, agent=agent)
    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    try:
        result = crew.kickoff(inputs={})
        raw = getattr(result, "raw", str(result))
        return {"raw": raw, "text": raw}
    except Exception as e:
        _LOG.warning("crewai node failed: %s", e)
        raise


def handler_trigger_input(ctx: NodeExecContext, p: TriggerInputParams) -> dict[str, Any]:
    inputs = dict(ctx.workflow_inputs)
    if p.default_topic and not str(inputs.get("topic", "")).strip():
        inputs["topic"] = p.default_topic
        ctx.workflow_inputs["topic"] = p.default_topic  # propagate to downstream {{ topic }}
    if p.keys:
        return {k: inputs[k] for k in p.keys if k in inputs}
    return inputs


def handler_crewai(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = CrewAIParams.model_validate(params)
    return _run_crewai_single_task(ctx, p)


def handler_reddit(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = RedditSourceParams.model_validate(params)
    template_ctx = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    subs = render_template(p.subreddits_template, template_ctx)
    raw = _invoke_tool_like(reddit_top_signals, {"subreddits": subs, "limit": p.limit})
    text = raw if isinstance(raw, str) else str(raw)
    return {"text": text, "subreddits": subs}


def handler_instagram(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = InstagramSourceParams.model_validate(params)
    template_ctx = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    if p.scraping_mode == "creator_profiles":
        users_raw = render_template(p.usernames_template, template_ctx)
        text = fetch_instagram_creator_posts_markdown(users_raw, p.posts_per_profile)
        return {"text": text, "hashtags": "", "usernames": users_raw.strip()}
    tags = render_template(p.hashtags_template, template_ctx)
    raw = _invoke_tool_like(
        instagram_trend_signals,
        {"hashtags": tags, "result_limit": p.result_limit},
    )
    text = raw if isinstance(raw, str) else str(raw)
    return {"text": text, "hashtags": tags, "usernames": ""}


def handler_serper(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = SerperSourceParams.model_validate(params)
    template_ctx = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    q = render_template(p.query_template, template_ctx)

    try:
        from crewai_tools import SerperDevTool
    except Exception as e:
        raise RuntimeError("Serper Dev tool unavailable.") from e

    tool = SerperDevTool()
    raw = _invoke_tool_like(tool, {"search_query": q})
    text = json.dumps(raw, default=str) if not isinstance(raw, str) else raw
    return {"text": text, "query": q}


def handler_scrape(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = ScrapeURLParams.model_validate(params)
    template_ctx = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    url = render_template(p.url_template, template_ctx)

    try:
        from crewai_tools import ScrapeWebsiteTool
    except Exception as e:
        raise RuntimeError("Scrape website tool unavailable.") from e

    tool = ScrapeWebsiteTool()
    raw = _invoke_tool_like(tool, {"website_url": url})
    text = raw if isinstance(raw, str) else str(raw)
    return {"text": text, "url": url}


def handler_memory_query(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = MemoryQueryParams.model_validate(params)
    if ctx.memory_collection is None:
        raise RuntimeError("Chroma memory collection is not configured for this run.")
    k = p.top_k or int(ctx.workflow_inputs.get("top_k_memory", 5))
    k = max(1, min(k, 40))
    tool = build_memory_query_tool(ctx.memory_collection, k)
    template_ctx = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    q = render_template(p.query_template, template_ctx)
    raw = _invoke_tool_like(tool, {"topic_and_hook": q})
    text = raw if isinstance(raw, str) else str(raw)
    return {"text": text, "query": q, "top_k": k}


def handler_memory_write(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = MemoryWriteParams.model_validate(params)
    if ctx.memory_collection is None:
        raise RuntimeError("Chroma memory collection is not configured for this run.")
    tpl = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    topic = render_template(p.topic_template, tpl)
    hook = render_template(p.hook_template, tpl)
    platform = render_template(p.platform_template, tpl)
    angle = render_template(p.angle_template, tpl)
    ps_raw = render_template(p.predicted_score_template, tpl)
    try:
        predicted_score = int(float(ps_raw))
    except ValueError:
        predicted_score = 50
    content_id_raw = (
        render_template(p.content_id_template, tpl) if p.content_id_template else None
    )
    cid = content_id_raw.strip() if content_id_raw else str(uuid.uuid4())

    mw = build_memory_write_tool(ctx.memory_collection, {"run_id": ctx.run_id})
    msg = _invoke_tool_like(
        mw,
        {
            "content_id": cid,
            "topic": topic,
            "hook": hook,
            "platform": platform,
            "angle": angle,
            "predicted_score": predicted_score,
        },
    )
    msg_s = msg if isinstance(msg, str) else str(msg)
    return {
        "message": msg_s,
        "content_id": cid,
        "topic": topic,
        "hook": hook,
        "platform": platform,
        "angle": angle,
        "predicted_score": predicted_score,
    }


def handler_transform_template(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = TransformTemplateParams.model_validate(params)
    template_ctx = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    out = render_template(p.template, template_ctx)
    return {"text": out}


def _parse_campaign_result(raw: Any) -> tuple[dict[str, Any] | None, str | None]:
    if raw is None:
        return None, None
    if isinstance(raw, dict):
        candidate = raw.get("campaign_result", raw)
        try:
            return CampaignResult.model_validate(candidate).model_dump(mode="json"), None
        except Exception as e:
            return None, str(e)
    if not isinstance(raw, str):
        raw = str(raw)
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end <= start:
            return None, "No JSON object found in campaign node output."
        try:
            parsed = json.loads(text[start : end + 1])
        except json.JSONDecodeError as e:
            return None, str(e)
    try:
        return CampaignResult.model_validate(parsed).model_dump(mode="json"), None
    except Exception as e:
        return None, str(e)


def handler_output_pieces(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = OutputPiecesParams.model_validate(params)
    bucket = ctx.completed_outputs
    if p.include_node_metadata:
        result: dict[str, Any] = {"nodes": dict(bucket)}
    else:
        result = {"chunks": list(bucket.values())}
    if p.campaign_node_id:
        campaign_node = bucket.get(p.campaign_node_id)
        raw = None
        if isinstance(campaign_node, dict):
            raw = campaign_node.get("campaign_result")
            raw = raw if raw is not None else campaign_node.get("json")
            raw = raw if raw is not None else campaign_node.get("raw")
            raw = raw if raw is not None else campaign_node.get("text")
        else:
            raw = campaign_node
        campaign_result, parse_error = _parse_campaign_result(raw)
        if campaign_result is not None:
            result["campaign_result"] = campaign_result
        elif parse_error:
            result["campaign_parse_error"] = parse_error
    return result


def handler_openai_image(ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    p = OpenAIImageParams.model_validate(params)
    return run_openai_image_node(ctx, p)


_REGISTRY: dict[str, tuple[dict[str, Any], Any]] = {
    "trigger.input": (
        TriggerInputParams.model_json_schema(),
        lambda ctx, raw: handler_trigger_input(ctx, TriggerInputParams.model_validate(raw)),
    ),
    "agent.crewai": (CrewAIParams.model_json_schema(), lambda ctx, raw: handler_crewai(ctx, raw)),
    "source.reddit": (RedditSourceParams.model_json_schema(), lambda ctx, raw: handler_reddit(ctx, raw)),
    "source.instagram": (
        InstagramSourceParams.model_json_schema(),
        lambda ctx, raw: handler_instagram(ctx, raw),
    ),
    "source.serper": (SerperSourceParams.model_json_schema(), lambda ctx, raw: handler_serper(ctx, raw)),
    "source.scrape_url": (ScrapeURLParams.model_json_schema(), lambda ctx, raw: handler_scrape(ctx, raw)),
    "memory.query": (MemoryQueryParams.model_json_schema(), lambda ctx, raw: handler_memory_query(ctx, raw)),
    "voice.load": (
        VoiceLoadParams.model_json_schema(),
        lambda ctx, raw: handler_voice_load(ctx, raw),
    ),
    "memory.write": (MemoryWriteParams.model_json_schema(), lambda ctx, raw: handler_memory_write(ctx, raw)),
    "transform.template": (
        TransformTemplateParams.model_json_schema(),
        lambda ctx, raw: handler_transform_template(ctx, raw),
    ),
    "output.pieces": (
        OutputPiecesParams.model_json_schema(),
        lambda ctx, raw: handler_output_pieces(ctx, raw),
    ),
    "media.gemini_image": (
        OpenAIImageParams.model_json_schema(),
        lambda ctx, raw: handler_openai_image(ctx, raw),
    ),
}


def run_handler(node_type: str, ctx: NodeExecContext, params: dict[str, Any]) -> dict[str, Any]:
    if node_type not in _REGISTRY:
        raise ValueError(f"Unknown node type: {node_type}")
    _, fn = _REGISTRY[node_type]
    return fn(ctx, params)


def schemas_by_type() -> dict[str, dict[str, Any]]:
    return {k: v[0] for k, v in _REGISTRY.items()}

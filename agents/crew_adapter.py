"""CrewAI pipeline runner — wires YAML agents/tasks and tools."""

from __future__ import annotations

import logging
import os
from collections import Counter, defaultdict
from pathlib import Path

import yaml
from crewai import Agent, Crew, Process, Task

from core.config import ContentPiece, CrewFinalOutput, RunConfig, RunResult, RunSummary
from memory.chroma_client import get_performance_collection
from tools.instagram_apify_tool import (
    instagram_creator_post_signals,
    instagram_trend_signals,
)
from tools.landing_page_tool import analyze_competitor_page
from tools.memory_query import build_memory_query_tool
from tools.memory_write import build_memory_write_tool
from tools.reddit_tool import reddit_top_signals
from tools.scorer_rubric import rubric_prompt_block
from crewai_tools import ScrapeWebsiteTool, SerperDevTool

_LOG = logging.getLogger(__name__)

_CONFIG_DIR = Path(__file__).resolve().parent / "config"


def _serper_query_hints(niche: str) -> str:
    """Serper query lines derived only from the user niche — no vertical presets."""
    n = niche.strip()
    return "\n".join(
        [
            f'- "{n} news"',
            f'- "{n} reddit discussion"',
            f'- "{n} trends"',
            f'- "{n} problems complaints"',
        ]
    )


def _load_yaml(name: str) -> dict:
    path = _CONFIG_DIR / name
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def _finalize_summary(pieces: list) -> RunSummary:
    if not pieces:
        return RunSummary()
    pb = Counter(getattr(p, "platform", "?") for p in pieces)
    trend_scores: dict[str, list[int]] = defaultdict(list)
    for p in pieces:
        trend_scores[getattr(p, "trend", "")].append(getattr(p, "predicted_score", 0))
    avg = {t: sum(sc) / len(sc) for t, sc in trend_scores.items() if t}
    top_trends = sorted(avg.keys(), key=lambda t: avg[t], reverse=True)[:3]
    return RunSummary(
        total_pieces=len(pieces),
        platform_breakdown=dict(pb),
        top_trends=top_trends,
        memory_entries_written=len(pieces),
        memory_queries_performed=len(pieces),
    )


class CrewAIPipelineRunner:
    def run(self, config: RunConfig) -> RunResult:
        run_id = config.resolved_run_id()
        os.environ.setdefault("OPENAI_MODEL", "gpt-4.1-nano")
        agents_yaml = _load_yaml("agents.yaml")
        tasks_yaml = _load_yaml("tasks.yaml")
        model = os.environ.get("OPENAI_MODEL", agents_yaml.get("model_default", "gpt-4.1-nano"))

        collection = get_performance_collection()
        run_id_holder = {"run_id": run_id}
        mq = build_memory_query_tool(collection, config.top_k_memory)
        mw = build_memory_write_tool(collection, run_id_holder)

        tool_registry = {
            "reddit_top_signals": reddit_top_signals,
            "serper_search": SerperDevTool(),
            "read_website": ScrapeWebsiteTool(),
            "analyze_competitor_page": analyze_competitor_page,
            "instagram_trend_signals": instagram_trend_signals,
            "instagram_creator_post_signals": instagram_creator_post_signals,
            "memory_query_similar": mq,
            "memory_write_entry": mw,
        }

        trend_tool_keys = list(agents_yaml["tool_sets"]["trend_hunter_base"])
        if config.include_instagram:
            trend_tool_keys.extend(agents_yaml["tool_sets"]["trend_hunter_instagram"])

        trend_tools = [tool_registry[k] for k in trend_tool_keys]

        specs = agents_yaml["agents"]
        agent_objs: dict[str, Agent] = {}

        voice_block = "No voice profile — use a clean platform-native voice."
        if getattr(config, "voice_profile_id", None):
            try:
                from voice.store import load_profile

                voice_block = (
                    load_profile(config.voice_profile_id).summary_block.strip()
                    or voice_block
                )
            except Exception as e:
                _LOG.warning("voice profile load failed: %s", e)

        ctx = {
            "niche": config.niche,
            "subreddits": config.resolved_subreddits_csv(),
            "serper_query_hints": _serper_query_hints(config.niche),
            "platforms": ", ".join(config.platforms),
            "angles": config.angles,
            "variations": config.variations,
            "run_id": run_id,
            "top_k_memory": config.top_k_memory,
            "rubric_block": rubric_prompt_block(),
            "voice_block": voice_block,
        }

        def make_agent(key: str, tools: list) -> Agent:
            s = specs[key]

            def _fmt(fragment: object) -> str:
                txt = fragment if isinstance(fragment, str) else str(fragment)
                return txt.format(**ctx)

            return Agent(
                role=_fmt(s["role"]),
                goal=_fmt(s["goal"]),
                backstory=_fmt(s["backstory"]),
                tools=tools,
                llm=model,
                verbose=False,
            )

        agent_objs["trend_hunter"] = make_agent("trend_hunter", trend_tools)
        for key in (
            "audience_psychologist",
            "content_strategist",
            "copywriter",
            "creative_director",
        ):
            agent_objs[key] = make_agent(key, [])
        agent_objs["performance_analyst"] = make_agent(
            "performance_analyst",
            [mq, mw],
        )

        tasks_list: list[Task] = []
        for spec in tasks_yaml["tasks"]:
            desc = spec["description"].format(**ctx)
            exp = spec["expected_output"].format(**ctx)
            kwargs: dict = {
                "description": desc,
                "expected_output": exp,
                "agent": agent_objs[spec["agent"]],
            }
            if spec["id"] == "score_and_memory":
                kwargs["output_pydantic"] = CrewFinalOutput
            tasks_list.append(Task(**kwargs))

        crew = Crew(
            agents=list(agent_objs.values()),
            tasks=tasks_list,
            process=Process.sequential,
            verbose=False,
        )

        try:
            result = crew.kickoff(inputs={})
        except Exception as e:
            _LOG.exception("crew kickoff failed")
            return RunResult(success=False, run_id=run_id, error=str(e))

        try:
            final = self._extract_final(result)
            pieces = [
                ContentPiece(
                    content_id=p.content_id,
                    run_id=run_id,
                    trend=p.trend,
                    angle=p.angle,
                    platform=p.platform,
                    variation_number=p.variation_number,
                    body=p.body,
                    creative_brief=p.creative_brief,
                    predicted_score=p.predicted_score,
                    score_reasoning=p.score_reasoning,
                    recommended=p.recommended,
                )
                for p in final.pieces
            ]
            summary = _finalize_summary(pieces)
            return RunResult(
                success=True,
                run_id=run_id,
                pieces=pieces,
                summary=summary,
                raw_output=getattr(result, "raw", str(result)),
            )
        except Exception as e:
            _LOG.exception("parse crew output failed")
            raw = getattr(result, "raw", str(result))
            return RunResult(success=False, run_id=run_id, error=str(e), raw_output=raw)

    def _extract_final(self, result: object) -> CrewFinalOutput:
        jd = getattr(result, "json_dict", None)
        if jd:
            return CrewFinalOutput.model_validate(jd)
        pyd = getattr(result, "pydantic", None)
        if pyd is not None:
            return CrewFinalOutput.model_validate(
                pyd.model_dump() if hasattr(pyd, "model_dump") else pyd
            )
        tasks_out = getattr(result, "tasks_output", []) or []
        if tasks_out:
            last = tasks_out[-1]
            raw_last = getattr(last, "raw", None) or str(last)
            raise ValueError(f"No structured output; last task raw: {raw_last[:500]}")
        raw = getattr(result, "raw", "")
        raise ValueError(f"No structured output from crew: {raw[:800]}")


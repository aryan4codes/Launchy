"""Workflow source.instagram handler."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tools.instagram_apify_tool import normalize_instagram_usernames
from workflow.context import NodeExecContext
from workflow.node_handlers import run_handler
from workflow.schema import CampaignResult, NodeSpec, WorkflowSpec


def _ctx(
    *,
    workflow_inputs: dict,
    upstream_outputs: dict | None = None,
    params: dict | None = None,
) -> NodeExecContext:
    return NodeExecContext(
        run_id="r1",
        workflow_inputs=workflow_inputs,
        upstream_outputs=upstream_outputs or {},
        completed_outputs={},
        node=NodeSpec(id="instagram", type="source.instagram", params=params or {}),
        outputs_base=Path("."),
        memory_collection=None,
    )


def test_normalize_usernames_from_urls() -> None:
    assert normalize_instagram_usernames("Foo, @bar, https://www.instagram.com/baz/") == ["Foo", "bar", "baz"]


def test_instagram_hashtag_mode_calls_tool(monkeypatch: pytest.MonkeyPatch) -> None:
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
        {"scraping_mode": "hashtags", "result_limit": 7},
    )
    assert calls == [("foo,bar", 7)]
    assert "instagram hashtag signals" in out["text"].lower()
    assert out["hashtags"] == "foo,bar"
    assert out["usernames"] == ""


def test_instagram_hashtag_default_mode(monkeypatch: pytest.MonkeyPatch) -> None:
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


def test_instagram_creator_profiles_uses_fetch(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, int]] = []

    def fake_fetch(raw: str, n: int) -> str:
        calls.append((raw.strip(), n))
        return "### Instagram creator post signals (Apify)\nActor: test\n"

    monkeypatch.setattr(
        "workflow.node_handlers.fetch_instagram_creator_posts_markdown",
        fake_fetch,
    )

    out = run_handler(
        "source.instagram",
        _ctx(
            workflow_inputs={"topic": "AI"},
            upstream_outputs={"instagram_creator_scout": {"text": "userone, usertwo"}},
        ),
        {"scraping_mode": "creator_profiles", "posts_per_profile": 12},
    )
    assert calls == [("userone, usertwo", 12)]
    assert "instagram creator post signals" in out["text"].lower()
    assert out["hashtags"] == ""
    assert "userone" in out["usernames"]


def test_launchy_templates_include_instagram_pipeline() -> None:
    root = Path(__file__).resolve().parent.parent / "workflows" / "templates"
    for name in ("launchy_virality_plus_images.json", "avcm_classic.json"):
        spec = WorkflowSpec.model_validate_json((root / name).read_text(encoding="utf-8"))
        types = {n.type for n in spec.nodes}
        ids = {n.id for n in spec.nodes}
        assert "source.instagram" in types
        assert "instagram" in ids
        assert "instagram_creator_scout" in ids
        assert "instagram_profile_source" in ids
        assert "trend_synthesizer" in ids
        assert "persona_synthesizer" in ids
        assert "platform_campaign_assets" in ids
        assert "posting_planner" in ids
        assert "campaign_packager" in ids
        out = next(n for n in spec.nodes if n.id == "out")
        assert out.params["campaign_node_id"] == "campaign_packager"


def _sample_campaign_result() -> dict:
    evidence = {
        "source": "reddit",
        "title": "Thread about creator pain",
        "url": "https://example.com/thread",
        "metric": "42 comments",
        "quote_or_summary": "Creators are asking for concrete campaign examples.",
        "relevance": "Shows the audience wants practical posting guidance.",
    }
    trend = {
        "title": "Practical campaign breakdowns",
        "why_now": "Multiple sources show creators are tired of generic trend advice.",
        "audience": "Solo creators building authority.",
        "evidence": [evidence],
        "confidence": 0.82,
        "risk": "May feel too meta if not grounded in examples.",
        "recommended_platforms": ["TikTok", "Instagram", "LinkedIn", "X"],
    }
    return {
        "creator_persona": {
            "voice_summary": "Clear, warm, tactical creator educator.",
            "tone_traits": ["practical", "encouraging"],
            "humor_style": "light observational",
            "content_formats": ["short video", "carousel"],
            "audience": "Creators who want repeatable campaign systems.",
            "recurring_themes": ["trend research", "content systems"],
            "visual_style": "clean editorial cards",
            "caption_patterns": ["Start with a concrete pain point."],
            "do_say": ["Here is what to post next."],
            "do_not_say": ["Just be consistent."],
            "example_hooks": ["Your next campaign should not start with a blank doc."],
            "persona_prompt": "Write as a clear tactical creator educator.",
            "instagram_profile": "https://www.instagram.com/example/",
        },
        "trend_opportunities": [trend],
        "campaign_pack": {
            "selected_trend": trend,
            "campaign_big_idea": "Turn one trend into a platform-ready campaign pack.",
            "platform_assets": [
                {
                    "platform": "TikTok",
                    "format": "short video",
                    "hook": "Your next campaign should start here.",
                    "body": "Show the trend, the angle, and the posting plan.",
                    "script": "Open with the creator pain, then reveal the pack.",
                    "caption": "Save this before you plan your next post.",
                    "cta": "Comment your niche.",
                    "production_notes": "Use quick cuts and on-screen labels.",
                }
            ],
            "visual_assets": [
                {
                    "asset_type": "hero",
                    "concept": "Campaign pack laid out as editorial cards.",
                    "prompt": "Clean editorial creator campaign cards on a soft background.",
                    "on_screen_text": ["Trend", "Angle", "Assets", "Schedule"],
                    "production_notes": "Avoid fake app UI.",
                }
            ],
            "posting_plan": [
                {
                    "order": 1,
                    "platform": "TikTok",
                    "timing": "Day 1 morning",
                    "asset_ref": "TikTok short video",
                    "purpose": "Introduce the campaign angle.",
                    "repurposing_notes": "Turn comments into X follow-ups.",
                }
            ],
            "evidence": [evidence],
        },
        "markdown_summary": "A creator-ready campaign pack grounded in evidence.",
    }


def test_campaign_result_contract_accepts_expected_shape() -> None:
    result = CampaignResult.model_validate(_sample_campaign_result())
    assert result.creator_persona.voice_summary.startswith("Clear")
    assert result.campaign_pack.platform_assets[0].platform == "TikTok"


def test_output_pieces_extracts_campaign_result_from_json_text() -> None:
    ctx = _ctx(workflow_inputs={"topic": "AI creators"})
    ctx.completed_outputs.update(
        {
            "campaign_packager": {
                "text": json.dumps(_sample_campaign_result()),
            }
        }
    )
    out = run_handler(
        "output.pieces",
        ctx,
        {"campaign_node_id": "campaign_packager"},
    )
    assert "campaign_result" in out
    assert out["campaign_result"]["campaign_pack"]["campaign_big_idea"].startswith("Turn one trend")
    assert "nodes" in out

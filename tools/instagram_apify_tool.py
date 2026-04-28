"""Instagram via Apify — stub until actor wiring + optional dependency install."""

from __future__ import annotations

import logging

from crewai.tools import tool

_LOG = logging.getLogger(__name__)


@tool("instagram_trend_signals")
def instagram_trend_signals(hashtags: str, result_limit: int = 15) -> str:
    """
    Pull Instagram hashtag signals (planned: Apify actor). Optional — requires --instagram and APIFY_API_TOKEN.
    Current implementation returns a clear stub message so runs stay Reddit-first.
    """
    _LOG.warning("instagram_trend_signals called but Apify Instagram actor is not wired yet")
    return (
        "Instagram signals are not enabled in this build. "
        "Use Reddit + Serper for discovery. "
        "When implemented: install optional `[instagram]` deps, set APIFY_API_TOKEN, "
        "and validate actor input schema via Apify MCP before enabling."
    )


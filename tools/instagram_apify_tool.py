"""Instagram trend signals via Apify hashtag actors."""

from __future__ import annotations

import logging
import os
from typing import Any

from crewai.tools import tool

_LOG = logging.getLogger(__name__)
_DEFAULT_ACTOR_ID = "apify/instagram-hashtag-scraper"
_MAX_RESULT_LIMIT = 50


def _normalize_hashtags(raw: str) -> list[str]:
    tags: list[str] = []
    for part in raw.split(","):
        cleaned = part.strip().lstrip("#")
        if cleaned:
            tags.append(cleaned)
    dedup: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        key = tag.lower()
        if key in seen:
            continue
        seen.add(key)
        dedup.append(tag)
    return dedup


def _format_item(item: dict[str, Any]) -> str:
    caption = str(item.get("caption") or item.get("text") or "").strip().replace("\n", " ")
    caption = caption[:180] + "..." if len(caption) > 180 else caption
    likes = item.get("likesCount") or item.get("likes", 0)
    comments = item.get("commentsCount") or item.get("comments", 0)
    url = item.get("url") or item.get("postUrl") or item.get("shortCodeUrl") or ""
    posted = item.get("timestamp") or item.get("takenAtTimestamp") or ""
    parts = [f"({likes} likes / {comments} comments)"]
    if caption:
        parts.append(caption)
    if posted:
        parts.append(f"@ {posted}")
    if url:
        parts.append(f":: {url}")
    return " ".join(parts)


def _extract_items(dataset_payload: Any) -> list[dict[str, Any]]:
    if isinstance(dataset_payload, dict):
        items = dataset_payload.get("items")
        if isinstance(items, list):
            return [it for it in items if isinstance(it, dict)]
    items_attr = getattr(dataset_payload, "items", None)
    if isinstance(items_attr, list):
        return [it for it in items_attr if isinstance(it, dict)]
    return []


@tool("instagram_trend_signals")
def instagram_trend_signals(hashtags: str, result_limit: int = 15) -> str:
    """
    Pull Instagram hashtag signals using an Apify actor.
    Optional — requires --instagram, APIFY_API_TOKEN, and optional dependency `[instagram]`.
    """
    tags = _normalize_hashtags(hashtags)
    if not tags:
        return "Error: no hashtags provided."

    token = os.getenv("APIFY_API_TOKEN", "").strip()
    if not token:
        return (
            "Instagram signals require APIFY_API_TOKEN. "
            "Set it in `.env`, then rerun with `--instagram`."
        )

    actor_id = os.getenv("APIFY_INSTAGRAM_ACTOR", _DEFAULT_ACTOR_ID).strip() or _DEFAULT_ACTOR_ID
    results_type = os.getenv("APIFY_INSTAGRAM_RESULTS_TYPE", "posts").strip().lower() or "posts"
    safe_limit = max(1, min(int(result_limit), _MAX_RESULT_LIMIT))
    if results_type not in {"posts", "reels"}:
        results_type = "posts"
    run_input = {
        "hashtags": tags,
        "resultsType": results_type,
        "resultsLimit": safe_limit,
    }

    try:
        from apify_client import ApifyClient
    except ImportError:
        return (
            "Instagram signals require optional dependency `apify-client`. "
            "Install with `uv sync --extra instagram`."
        )

    try:
        client = ApifyClient(token=token)
        run = client.actor(actor_id).call(run_input=run_input)
        dataset_id = run.get("defaultDatasetId") if isinstance(run, dict) else None
        if not dataset_id:
            return f"No dataset returned from Apify actor `{actor_id}`."
        dataset_payload = client.dataset(dataset_id).list_items(limit=safe_limit)
        items = _extract_items(dataset_payload)
        if not items:
            return f"No Instagram signals found for: {', '.join(tags)}"
        lines = [
            f"### Instagram hashtag signals ({results_type})",
            f"Actor: {actor_id}",
            f"Hashtags: {', '.join(tags)}",
        ]
        for item in items[:safe_limit]:
            lines.append(f"- {_format_item(item)}")
        return "\n".join(lines)
    except Exception as exc:  # noqa: BLE001
        _LOG.warning("instagram apify fetch failed: %s", exc)
        return f"Instagram Apify fetch failed: {exc}"


"""Instagram signals via Apify — hashtag search and creator profile posts."""

from __future__ import annotations

import logging
import os
import re
from typing import Any

from crewai.tools import tool

_LOG = logging.getLogger(__name__)
_DEFAULT_HASHTAG_ACTOR = "apify/instagram-hashtag-scraper"
_DEFAULT_PROFILE_POSTS_ACTOR = "instagram-scraper/instagram-profile-posts-scraper"
_MAX_RESULT_LIMIT = 50
_MAX_PROFILES = 15
_MAX_DATASET_ITEMS = 250


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


def normalize_instagram_usernames(raw: str) -> list[str]:
    """Parse comma/newline-separated handles or instagram.com URLs into unique usernames (max _MAX_PROFILES)."""
    if not raw or not str(raw).strip():
        return []
    text = str(raw).strip()
    seen: set[str] = set()
    out: list[str] = []
    for part in re.split(r"[\n,]+", text):
        s = part.strip()
        if not s:
            continue
        lower = s.lower()
        if "instagram.com/" in lower:
            try:
                path = s.split("instagram.com/", 1)[1].split("?")[0].strip("/")
                seg = path.split("/")[0]
                skip = frozenset({"p", "reel", "reels", "stories", "explore", "tv"})
                if not seg or seg.lower() in skip:
                    continue
                s = seg
            except (IndexError, ValueError):
                continue
        s = s.lstrip("@").strip()
        if not s or not re.match(r"^[A-Za-z0-9._]{1,30}$", s):
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
        if len(out) >= _MAX_PROFILES:
            break
    return out


def _format_item(item: dict[str, Any], *, owner_hint: str | None = None) -> str:
    caption = str(item.get("caption") or item.get("text") or "").strip().replace("\n", " ")
    caption = caption[:180] + "..." if len(caption) > 180 else caption
    likes = item.get("likesCount") or item.get("likes") or item.get("like_count") or 0
    comments = item.get("commentsCount") or item.get("comments") or item.get("comment_count") or 0
    url = item.get("url") or item.get("postUrl") or item.get("shortCodeUrl") or ""
    posted = item.get("timestamp") or item.get("takenAtTimestamp") or ""
    owner = owner_hint or item.get("ownerUsername") or item.get("owner_username")
    if not owner and isinstance(item.get("owner"), dict):
        owner = item["owner"].get("username")
    prefix = f"[@{owner}] " if owner else ""
    parts = [f"{prefix}({likes} likes / {comments} comments)"]
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


def _require_apify_client():
    token = os.getenv("APIFY_API_TOKEN", "").strip()
    if not token:
        return None, (
            "Instagram signals require APIFY_API_TOKEN. "
            "Set it in `.env`, then rerun with `--instagram` or run the workflow again."
        )
    try:
        from apify_client import ApifyClient
    except ImportError:
        return None, (
            "Instagram signals require optional dependency `apify-client`. "
            "Install with `uv sync --extra instagram`."
        )
    return ApifyClient(token=token), None


def fetch_instagram_creator_posts_markdown(usernames_raw: str, posts_per_profile: int = 12) -> str:
    """
    Public posts from listed Instagram profiles via Apify (instagram-scraper/instagram-profile-posts-scraper).
    `posts_per_profile` is passed as postsPerProfile (actor minimum 5).
    """
    users = normalize_instagram_usernames(usernames_raw)
    if not users:
        return "Error: no Instagram usernames to scrape. Provide real handles (comma-separated, no @)."

    client, err = _require_apify_client()
    if err:
        return err

    actor_id = (
        os.getenv("APIFY_INSTAGRAM_PROFILE_ACTOR", _DEFAULT_PROFILE_POSTS_ACTOR).strip()
        or _DEFAULT_PROFILE_POSTS_ACTOR
    )
    safe_per = max(5, min(int(posts_per_profile), 50))
    run_input: dict[str, Any] = {
        "instagramUsernames": users,
        "postsPerProfile": safe_per,
    }

    try:
        assert client is not None
        run = client.actor(actor_id).call(run_input=run_input)
        dataset_id = run.get("defaultDatasetId") if isinstance(run, dict) else None
        if not dataset_id:
            return f"No dataset returned from Apify actor `{actor_id}`."
        cap = min(_MAX_DATASET_ITEMS, safe_per * len(users) + 10)
        dataset_payload = client.dataset(dataset_id).list_items(limit=cap)
        items = _extract_items(dataset_payload)
        if not items:
            return f"No posts returned for profiles: {', '.join(users)}"
        lines = [
            "### Instagram creator post signals (Apify)",
            f"Actor: {actor_id}",
            f"Profiles: {', '.join(users)}",
            f"Up to {safe_per} posts per profile",
        ]
        for item in items:
            lines.append(f"- {_format_item(item)}")
        return "\n".join(lines)
    except Exception as exc:  # noqa: BLE001
        _LOG.warning("instagram profile posts fetch failed: %s", exc)
        return f"Instagram profile Apify fetch failed: {exc}"


@tool("instagram_trend_signals")
def instagram_trend_signals(hashtags: str, result_limit: int = 15) -> str:
    """
    Pull Instagram hashtag signals using an Apify actor.
    Optional — requires --instagram, APIFY_API_TOKEN, and optional dependency `[instagram]`.
    """
    tags = _normalize_hashtags(hashtags)
    if not tags:
        return "Error: no hashtags provided."

    client, err = _require_apify_client()
    if err:
        return err

    actor_id = os.getenv("APIFY_INSTAGRAM_ACTOR", _DEFAULT_HASHTAG_ACTOR).strip() or _DEFAULT_HASHTAG_ACTOR
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
        assert client is not None
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


@tool("instagram_creator_post_signals")
def instagram_creator_post_signals(usernames: str, posts_per_profile: int = 12) -> str:
    """
    Fetch recent public posts from listed Instagram creator profiles (comma-separated handles).
    Uses Apify profile-posts actor. Requires APIFY_API_TOKEN and `uv sync --extra instagram`.
    """
    return fetch_instagram_creator_posts_markdown(usernames, posts_per_profile)


def _is_reel_row(item: dict[str, Any]) -> bool:
    u = str(item.get("url") or item.get("postUrl") or item.get("shortCodeUrl") or "").lower()
    if "/reel/" in u:
        return True
    pt = str(item.get("productType") or item.get("product_type") or "").lower()
    if pt in {"clips", "reel"}:
        return True
    if item.get("isReel") is True or item.get("is_reel") is True:
        return True
    mt = str(item.get("type") or item.get("mediaType") or "").lower()
    if mt in {"clips", "reel"}:
        return True
    return False


def _video_url_from_item(item: dict[str, Any]) -> str:
    for k in ("videoUrl", "video_url", "playbackUrl", "videoPlayUrl", "videoDownloadUrl", "downloadUrl"):
        v = item.get(k)
        if isinstance(v, str) and v.strip().startswith("http"):
            return v.strip()
    # Nested variants from some actors
    cand = item.get("video")
    if isinstance(cand, dict):
        for k in ("url", "playableUrl", "playable_url"):
            v = cand.get(k)
            if isinstance(v, str) and v.startswith("http"):
                return v.strip()
    return ""


def _shortcode_from_item(item: dict[str, Any]) -> str:
    for k in ("shortCode", "shortcode", "id"):
        v = item.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip().split("_")[0][:64]
    u = str(item.get("url") or item.get("postUrl") or "")
    if "/reel/" in u:
        try:
            seg = u.split("/reel/", 1)[1].split("/")[0].split("?")[0]
            return seg[:64] if seg else "post"
        except (IndexError, ValueError):
            pass
    if "/p/" in u:
        try:
            seg = u.split("/p/", 1)[1].split("/")[0].split("?")[0]
            return seg[:64] if seg else "post"
        except (IndexError, ValueError):
            pass
    return "post"


def list_instagram_profile_reels_for_voice(
    username_or_url: str,
    *,
    max_reels: int,
    posts_per_profile: int = 50,
) -> tuple[list[dict[str, Any]], str | None]:
    """
    Public reels for one profile via the same Apify profile-posts actor.
    Returns rows with at least caption + optional video URL for transcription.
    Second value is an error string when Apify is unavailable or nothing matched.
    """
    users = normalize_instagram_usernames(username_or_url)
    if not users or len(users) != 1:
        return [], "Provide one Instagram profile URL or handle (e.g. instagram.com/yourname)."
    if max_reels < 1:
        return [], None

    client, err = _require_apify_client()
    if err:
        return [], err

    actor_id = (
        os.getenv("APIFY_INSTAGRAM_PROFILE_ACTOR", _DEFAULT_PROFILE_POSTS_ACTOR).strip()
        or _DEFAULT_PROFILE_POSTS_ACTOR
    )
    safe_per = max(5, min(int(posts_per_profile), 50))
    run_input: dict[str, Any] = {
        "instagramUsernames": users,
        "postsPerProfile": safe_per,
    }
    try:
        assert client is not None
        run = client.actor(actor_id).call(run_input=run_input)
        dataset_id = run.get("defaultDatasetId") if isinstance(run, dict) else None
        if not dataset_id:
            return [], f"No dataset returned from Apify actor `{actor_id}`."
        dataset_payload = client.dataset(dataset_id).list_items(limit=min(_MAX_DATASET_ITEMS, safe_per + 5))
        items = _extract_items(dataset_payload)
    except Exception as exc:  # noqa: BLE001
        _LOG.warning("instagram reels fetch failed: %s", exc)
        return [], f"Instagram Apify fetch failed: {exc}"

    reels: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        if not _is_reel_row(item) and not (
            _video_url_from_item(item) and str(item.get("type") or "").lower() == "video"
        ):
            continue
        sc = _shortcode_from_item(item)
        vu = _video_url_from_item(item)
        cap = str(item.get("caption") or item.get("text") or "").strip()
        reels.append(
            {
                "shortcode": sc,
                "videoUrl": vu,
                "caption": cap,
                "url": str(item.get("url") or item.get("postUrl") or ""),
            }
        )
        if len(reels) >= max_reels:
            break

    # If nothing matched reel heuristics, fall back to any video rows with a video URL
    if not reels:
        for item in items:
            if not isinstance(item, dict):
                continue
            vu = _video_url_from_item(item)
            if not vu:
                continue
            sc = _shortcode_from_item(item)
            cap = str(item.get("caption") or item.get("text") or "").strip()
            reels.append(
                {
                    "shortcode": sc,
                    "videoUrl": vu,
                    "caption": cap,
                    "url": str(item.get("url") or item.get("postUrl") or ""),
                }
            )
            if len(reels) >= max_reels:
                break

    if not reels:
        return [], "No public video/reel items returned for this profile (private account or actor output changed)."
    return reels, None

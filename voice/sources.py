"""Normalize training samples: text, URLs, Reddit usernames, Instagram profiles."""

from __future__ import annotations

import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable, Literal

import requests
from crewai_tools import ScrapeWebsiteTool

SampleKind = Literal["text", "url", "reddit_user", "instagram_profile"]
ProgressCallback = Callable[[dict[str, Any]], None]

_LOG = logging.getLogger(__name__)
_DEFAULT_UA = (
    "Mozilla/5.0 (compatible; AVCM/1.0; +https://example.local; research bot)"
)
_SESSION = requests.Session()


def _strip_ws(s: str) -> str:
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    return s


def _fetch_user_submissions(username: str, *, limit: int = 15) -> str:
    """Fetch recent self-post and link titles + selftext snippets for a Reddit user."""
    user = username.strip().removeprefix("u/").removeprefix("/u/")
    if not user:
        return ""
    url = f"https://www.reddit.com/user/{user}/submitted.json?limit={limit}"
    try:
        r = _SESSION.get(url, headers={"User-Agent": _DEFAULT_UA, "Accept": "application/json"}, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        _LOG.warning("reddit user fetch failed %s: %s", user, e)
        return ""

    chunks: list[str] = []
    for child in data.get("data", {}).get("children", [])[:limit]:
        p = child.get("data", {})
        title = p.get("title", "") or ""
        selftext = (p.get("selftext") or "").strip()
        if selftext and selftext.lower() not in ("[removed]", "[deleted]"):
            body_preview = selftext[:2000]
            chunks.append(f"{title}\n{body_preview}")
        elif title:
            chunks.append(title)
    return "\n---\n".join(chunks) if chunks else ""


def scrape_url(url: str) -> str:
    """Return readable page text via CrewAI scrape tool."""
    u = url.strip()
    if not u:
        return ""
    tool = ScrapeWebsiteTool()
    run = getattr(tool, "run", None)
    if not callable(run):
        return ""
    try:
        out = run(**{"website_url": u})  # type: ignore[arg-type]
    except TypeError:
        out = run(u)  # type: ignore[misc]
    raw = getattr(out, "content", None)
    text = raw if isinstance(raw, str) else str(out)
    return _strip_ws(text[:12000])


def _instagram_profile_blob(
    value: str,
    creator_name: str,
    *,
    on_progress: ProgressCallback | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    """Fetch public reels via Apify, transcribe audio with OpenAI (gpt-4o-transcribe).

    Returns (blob_text, transcriptions_list).
    """
    from tools.audio_transcribe import transcribe_video_url_cached
    from tools.instagram_apify_tool import list_instagram_profile_reels_for_voice, normalize_instagram_usernames

    raw_max = int(os.getenv("VOICE_IG_MAX_REELS", "6"))
    max_reels = max(1, min(raw_max, 12))

    users = normalize_instagram_usernames(value.strip())
    handle = users[0] if users else (creator_name.strip() or "creator")

    if on_progress:
        on_progress({
            "type": "step",
            "step": "instagram_fetch",
            "msg": f"Fetching public reels from @{handle} via Apify…",
        })

    rows, err = list_instagram_profile_reels_for_voice(value.strip(), max_reels=max_reels)
    if err:
        return f"(Instagram import error: {err})", []
    if not rows:
        return "(Instagram: no public reels or in-feed video items found for this profile.)", []

    if on_progress:
        on_progress({
            "type": "step",
            "step": "instagram_fetched",
            "msg": f"Found {len(rows)} reel{'s' if len(rows) != 1 else ''} from @{handle} — transcribing in parallel…",
            "reel_count": len(rows),
            "handle": handle,
        })

    # ── Parallel transcription ──────────────────────────────────────────────
    # Each reel: download video + OpenAI call is independent I/O — run all at once.
    max_workers = min(len(rows), int(os.getenv("VOICE_TRANSCRIBE_WORKERS", "6")))

    def _transcribe_one(args: tuple[int, dict]) -> tuple[int, str, str, str, str, str]:
        """Returns (i, cap, vu, sc, url, trans)."""
        i, row = args
        cap = str(row.get("caption") or "").strip()
        vu = str(row.get("videoUrl") or "").strip()
        sc = str(row.get("shortcode") or f"{i}")
        url = str(row.get("url") or "").strip()
        trans = ""
        if vu:
            try:
                pr_parts = [f"The speaker is Instagram creator @{handle}."]
                if cap:
                    pr_parts.append(f"Posted caption (for context): {cap[:500]}")
                if creator_name.strip():
                    pr_parts.append(f"Display name hint: {creator_name.strip()}.")
                trans = transcribe_video_url_cached(vu, sc, prompt=" ".join(pr_parts)[:1200])
            except Exception as e:  # noqa: BLE001
                _LOG.warning("reel transcribe failed %s: %s", sc, e)
                trans = f"[Could not transcribe audio: {e}]"
        return i, cap, vu, sc, url, trans

    # dict keyed by reel index so we can reassemble in order
    results: dict[int, tuple[str, str, str, str, str]] = {}

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(_transcribe_one, (i, row)): i
            for i, row in enumerate(rows, 1)
        }
        for fut in as_completed(futures):
            idx, cap, _vu, sc, url, trans = fut.result()
            results[idx] = (cap, sc, url, trans, _vu)
            if on_progress:
                completed = len(results)
                on_progress({
                    "type": "step",
                    "step": "transcribe",
                    "msg": f"Transcribed reel {completed} of {len(rows)}: @{handle}",
                    "index": completed,
                    "total": len(rows),
                    "shortcode": sc,
                })
                on_progress({
                    "type": "transcription",
                    "reel_index": idx,
                    "shortcode": sc,
                    "url": url,
                    "caption": cap[:300],
                    "transcript": trans[:800] if trans else "",
                })

    # Reassemble in original reel order
    parts: list[str] = [
        f"(Samples from Instagram @{handle}: public reels — caption + spoken transcript when audio is available.)"
    ]
    transcriptions: list[dict[str, Any]] = []

    for i in sorted(results):
        cap, sc, url, trans, _vu = results[i]
        line = (
            f"--- Reel {i} (shortcode {sc}) ---\n"
            f"POST_URL: {url}\n"
            f"CAPTION: {cap}\n"
            f"SPOKEN_TRANSCRIPT: {trans or '[no downloadable video audio / music-only / unavailable]'}\n"
        )
        parts.append(line)
        transcriptions.append({
            "reel_index": i,
            "shortcode": sc,
            "url": url,
            "caption": cap,
            "transcript": trans,
        })

    blob = "\n".join(parts)
    return _strip_ws(blob[:120000]), transcriptions


def collect_sample_texts(
    samples: list[dict[str, str]],
    *,
    creator_name: str = "",
    on_progress: ProgressCallback | None = None,
) -> tuple[list[str], int, list[dict[str, Any]]]:
    """
    Returns (list of cleaned text blobs, raw sample row count, transcriptions).

    Each logical sample row counts once: ``text`` (one row, may be many lines),
    ``url``, ``reddit_user``, or ``instagram_profile``.
    """
    out: list[str] = []
    row_count = 0
    all_transcriptions: list[dict[str, Any]] = []

    for row in samples:
        kind_raw = row.get("kind", "text")
        value = row.get("value", "") or ""
        kind: SampleKind = "text"
        if kind_raw in ("text", "url", "reddit_user", "instagram_profile"):
            kind = kind_raw  # type: ignore[assignment]
        row_count += 1

        if kind == "text":
            v = value.strip()
            if v:
                if on_progress:
                    on_progress({"type": "step", "step": "text_sample", "msg": "Reading pasted text sample…"})
                out.append(v[:8000])

        elif kind == "url":
            if on_progress:
                on_progress({"type": "step", "step": "url_scrape", "msg": f"Reading page: {value[:60]}…"})
            t = scrape_url(value)
            if t:
                out.append(t)

        elif kind == "reddit_user":
            u = value.strip().removeprefix("u/").removeprefix("/u/")
            if on_progress:
                on_progress({"type": "step", "step": "reddit_fetch", "msg": f"Fetching Reddit posts for u/{u}…"})
            t = _fetch_user_submissions(value)
            if t:
                hint = value.strip().removeprefix("u/").removeprefix("/u/")
                out.append(f"(Samples from Reddit u/{hint})\n{t}")

        elif kind == "instagram_profile":
            t, transcriptions = _instagram_profile_blob(value, creator_name, on_progress=on_progress)
            if t:
                out.append(t)
            all_transcriptions.extend(transcriptions)

        else:
            continue

    return out, row_count, all_transcriptions

"""Normalize training samples from text, URLs, and Reddit usernames."""

from __future__ import annotations

import logging
import re
from typing import Literal

import requests
from crewai_tools import ScrapeWebsiteTool

SampleKind = Literal["text", "url", "reddit_user"]

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
def collect_sample_texts(
    samples: list[dict[str, str]],
    *,
    creator_name: str = "",
) -> tuple[list[str], int]:
    """
    Returns (list of cleaned text blobs, raw sample row count).

    Multiple lines in one ``text`` sample count as one row; each ``url``
    / ``reddit_user`` is one row.
    """
    out: list[str] = []
    row_count = 0
    for row in samples:
        kind_raw = row.get("kind", "text")
        value = row.get("value", "") or ""
        kind: SampleKind = "text"
        if kind_raw in ("text", "url", "reddit_user"):
            kind = kind_raw  # type: ignore[assignment]
        row_count += 1
        if kind == "text":
            v = value.strip()
            if v:
                out.append(v[:8000])
        elif kind == "url":
            t = scrape_url(value)
            if t:
                out.append(t)
        elif kind == "reddit_user":
            t = _fetch_user_submissions(value)
            if t:
                hint = value.strip().removeprefix("u/").removeprefix("/u/")
                out.append(f"(Samples from Reddit u/{hint})\n{t}")
        else:
            continue
    if creator_name.strip() and not out:
        # allow empty sample list only when we have creator_name for profiler edge case — usually invalid
        pass
    return out, row_count

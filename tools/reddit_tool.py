"""Reddit JSON API signal collector with disk cache and backoff."""

from __future__ import annotations

import hashlib
import json
import logging
import time
from datetime import date
from pathlib import Path

import requests
from crewai.tools import tool

_CACHE_ROOT = Path.home() / ".avcm-cache" / "reddit"
_DEFAULT_UA = (
    "Mozilla/5.0 (compatible; AVCM/1.0; +https://example.local; research bot)"
)
_SESSION = requests.Session()


def _cache_path(subreddit: str) -> Path:
    day = date.today().isoformat()
    safe = hashlib.sha256(subreddit.lower().encode()).hexdigest()[:16]
    _CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    return _CACHE_ROOT / f"{safe}-{day}.json"


def _fetch_json(url: str, *, max_retries: int = 4) -> dict:
    headers = {"User-Agent": _DEFAULT_UA, "Accept": "application/json"}
    delay = 1.0
    last_err: Exception | None = None
    for attempt in range(max_retries):
        try:
            r = _SESSION.get(url, headers=headers, timeout=30)
            if r.status_code in (429, 502, 503, 504):
                time.sleep(delay)
                delay = min(delay * 2, 32)
                continue
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last_err = e
            time.sleep(delay)
            delay = min(delay * 2, 32)
    raise RuntimeError(f"Failed to fetch {url}: {last_err}")


def _load_subreddit_listing(subreddit: str, limit: int, use_cache: bool) -> dict:
    cache_file = _cache_path(subreddit)
    if use_cache and cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))
    url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
    data = _fetch_json(url)
    if use_cache:
        cache_file.write_text(json.dumps(data), encoding="utf-8")
    return data


@tool("reddit_top_signals")
def reddit_top_signals(subreddits: str, limit: int = 15) -> str:
    """
    Fetch hot posts from one or more subreddits (comma-separated names without 'r/').
    Returns title, score, comment count per post for trend analysis.
    """
    subs = [s.strip() for s in subreddits.split(",") if s.strip()]
    if not subs:
        return "Error: no subreddits provided."

    lines: list[str] = []
    for sub in subs[:8]:
        try:
            data = _load_subreddit_listing(sub, min(limit, 25), use_cache=True)
        except Exception as e:
            logging.getLogger(__name__).warning("reddit fetch failed %s: %s", sub, e)
            lines.append(f"### r/{sub} — error: {e}")
            continue
        posts = data.get("data", {}).get("children", [])
        lines.append(f"### r/{sub}")
        for child in posts[:limit]:
            p = child.get("data", {})
            title = p.get("title", "")
            ups = p.get("ups", 0)
            num_comments = p.get("num_comments", 0)
            url = p.get("url", "")
            lines.append(f"- ({ups}↑ / {num_comments}c) {title} :: {url}")
    return "\n".join(lines) if lines else "No Reddit data."

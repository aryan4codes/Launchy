"""Simple landing page headline/value-prop extraction."""

from __future__ import annotations

import logging

import requests
from bs4 import BeautifulSoup
from crewai.tools import tool

_SESSION = requests.Session()
_LOG = logging.getLogger(__name__)


@tool("analyze_competitor_page")
def analyze_competitor_page(url: str) -> str:
    """
    Fetch a public web page and extract visible headline-like text (h1, title, meta description).
    Use for competitor positioning signals.
    """
    try:
        r = _SESSION.get(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; AVCM/1.0) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml",
            },
            timeout=25,
        )
        r.raise_for_status()
    except Exception as e:
        _LOG.warning("landing page fetch failed: %s", e)
        return f"Could not fetch page: {e}"

    soup = BeautifulSoup(r.text, "html.parser")
    title = (soup.title.string or "").strip() if soup.title else ""
    h1 = soup.find("h1")
    h1_text = h1.get_text(strip=True) if h1 else ""
    meta = soup.find("meta", attrs={"name": "description"})
    desc = meta.get("content", "").strip() if meta else ""

    parts = [f"URL: {url}", f"Title tag: {title}", f"H1: {h1_text}", f"Meta description: {desc}"]
    return "\n".join(parts)

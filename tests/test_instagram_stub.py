"""Instagram stub tool."""

from __future__ import annotations

from tools.instagram_apify_tool import instagram_trend_signals


def test_stub_message() -> None:
    out = instagram_trend_signals.run("#saas", 10)
    assert "not enabled" in out.lower()

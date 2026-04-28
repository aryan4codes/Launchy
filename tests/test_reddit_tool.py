"""Reddit tool behaviour."""

from __future__ import annotations

from unittest.mock import patch

from tools.reddit_tool import reddit_top_signals


def test_reddit_top_signals_parses_posts() -> None:
    fake_json = {
        "data": {
            "children": [
                {
                    "data": {
                        "title": "Example SaaS post",
                        "ups": 42,
                        "num_comments": 10,
                        "url": "https://example.com",
                    }
                }
            ]
        }
    }
    with patch("tools.reddit_tool._load_subreddit_listing", return_value=fake_json):
        out = reddit_top_signals.run("SaaS", limit=5)
    assert "Example SaaS post" in out
    assert "42" in out


def test_reddit_empty_subreddits() -> None:
    assert "no subreddits" in reddit_top_signals.run("", limit=5).lower()

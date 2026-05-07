"""Instagram Apify tool tests."""

from __future__ import annotations

import sys
import types

from tools.instagram_apify_tool import instagram_trend_signals


def test_requires_token(monkeypatch) -> None:
    monkeypatch.delenv("APIFY_API_TOKEN", raising=False)
    out = instagram_trend_signals.run("#saas", 10)
    assert "apify_api_token" in out.lower()


def test_requires_hashtag_input(monkeypatch) -> None:
    monkeypatch.setenv("APIFY_API_TOKEN", "token")
    out = instagram_trend_signals.run("   ", 10)
    assert "no hashtags" in out.lower()


def test_formats_apify_results(monkeypatch) -> None:
    monkeypatch.setenv("APIFY_API_TOKEN", "token")
    monkeypatch.setenv("APIFY_INSTAGRAM_ACTOR", "apify/instagram-hashtag-scraper")

    class _Dataset:
        def list_items(self, limit: int):  # noqa: ARG002
            return {
                "items": [
                    {
                        "caption": "AI launch thread",
                        "likesCount": 42,
                        "commentsCount": 7,
                        "url": "https://instagram.com/p/abc",
                        "timestamp": "2026-05-07T00:00:00Z",
                    }
                ]
            }

    class _Actor:
        def call(self, run_input):
            assert run_input["hashtags"] == ["AI", "saas"]
            assert run_input["resultsType"] == "posts"
            assert run_input["resultsLimit"] == 15
            return {"defaultDatasetId": "dataset-1"}

    class _Client:
        def __init__(self, token: str):
            assert token == "token"

        def actor(self, actor_id: str):
            assert actor_id == "apify/instagram-hashtag-scraper"
            return _Actor()

        def dataset(self, dataset_id: str):
            assert dataset_id == "dataset-1"
            return _Dataset()

    fake_module = types.ModuleType("apify_client")
    fake_module.ApifyClient = _Client
    monkeypatch.setitem(sys.modules, "apify_client", fake_module)

    out = instagram_trend_signals.run("#AI, saas, #ai", 15)
    assert "instagram hashtag signals" in out.lower()
    assert "ai launch thread" in out.lower()

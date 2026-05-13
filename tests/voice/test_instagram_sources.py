"""Voice sample collection — Instagram profile row."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

import voice.sources as vs


def test_instagram_profile_sample_collects_reel_blob(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("VOICE_IG_MAX_REELS", "2")

    def fake_list(_url: str, *, max_reels: int, posts_per_profile: int = 50):
        assert max_reels == 2
        rows = [
            {"shortcode": "aa", "videoUrl": "https://cdn.example/v1.mp4", "caption": "hello", "url": "https://ig/r/aa"},
            {"shortcode": "bb", "videoUrl": "https://cdn.example/v2.mp4", "caption": "", "url": ""},
        ]
        return rows, None

    mock_tx = MagicMock(side_effect=["first transcript", "second transcript"])

    monkeypatch.setattr("tools.instagram_apify_tool.list_instagram_profile_reels_for_voice", fake_list)
    monkeypatch.setattr("tools.audio_transcribe.transcribe_video_url_cached", mock_tx)

    texts, n = vs.collect_sample_texts(
        [{"kind": "instagram_profile", "value": "https://www.instagram.com/creatorname/"}],
        creator_name="Test",
    )
    assert n == 1
    assert len(texts) == 1
    blob = texts[0]
    assert "Instagram @creatorname" in blob or "@creatorname" in blob
    assert "SPOKEN_TRANSCRIPT:" in blob
    assert "first transcript" in blob
    assert mock_tx.call_count == 2

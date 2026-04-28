"""Memory CSV ingest."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from memory.update import engagement_delta, update_row_from_csv_line


def test_engagement_delta() -> None:
    d = engagement_delta(predicted_score=50, likes=10, shares=2, comments=3)
    assert d == float((10 + 5 * 2 + 2 * 3) - 50)


def test_update_row_from_csv_line() -> None:
    pytest.importorskip("chromadb")
    coll = MagicMock()
    coll.get.side_effect = [
        {"ids": ["abc"], "metadatas": [{"predicted_score": 40}]},
        {"ids": ["abc"], "documents": ["topic\nhook line"]},
    ]

    with patch("memory.update.get_performance_collection", return_value=coll):
        out = update_row_from_csv_line("abc", likes=10, shares=1, comments=2)

    assert out["content_id"] == "abc"
    coll.update.assert_called_once()

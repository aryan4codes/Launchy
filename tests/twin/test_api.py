"""Twin HTTP surface (SSE mocked)."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from http_api.server import app
from http_api.routes import twin as twin_routes
import twin.session as ts


async def _fake_stream(**kwargs):  # type: ignore[no-untyped-def]
    yield {"type": "token", "delta": "ok"}
    yield {"type": "done"}


def test_twin_session_crud(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(ts, "SESSIONS_ROOT", tmp_path / "sessions")
    monkeypatch.setattr(twin_routes, "stream_twin_turn", _fake_stream)
    client = TestClient(app)

    created = client.post("/twin/sessions", json={"voice_profile_id": None})
    assert created.status_code == 200
    sid = created.json()["session_id"]

    listed = client.get("/twin/sessions")
    assert listed.status_code == 200
    assert any(row["session_id"] == sid for row in listed.json())

    with client.stream(
        "POST",
        f"/twin/sessions/{sid}/messages",
        json={"content": "ping", "tool_memory": True, "tool_research": True, "tool_workflow": True},
    ) as r:
        assert r.status_code == 200
        body = "".join(list(r.iter_text()))
        assert "token" in body

    got = client.get(f"/twin/sessions/{sid}")
    assert got.status_code == 200

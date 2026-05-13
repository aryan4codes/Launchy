"""Twin session file IO."""

from __future__ import annotations

from pathlib import Path

import pytest

from twin import session as ts


def test_append_and_read_messages(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(ts, "SESSIONS_ROOT", tmp_path)
    sid = "test-sid"
    meta = ts.TwinMeta(
        session_id=sid,
        voice_profile_id=None,
        created_at=ts.utc_now(),
        updated_at=ts.utc_now(),
    )
    ts.write_meta(meta)
    ts.append_message(sid, {"role": "user", "content": "hi"})
    ts.append_message(sid, {"role": "assistant", "content": "hello"})
    msgs = ts.read_messages(sid)
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"

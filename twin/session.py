"""Twin chat session — metadata JSON + newline-delimited messages."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


SESSIONS_ROOT = Path("outputs") / "twin_sessions"


def ensure_sessions_root() -> None:
    SESSIONS_ROOT.mkdir(parents=True, exist_ok=True)


def meta_path(session_id: str) -> Path:
    return SESSIONS_ROOT / f"{session_id}.json"


def log_path(session_id: str) -> Path:
    return SESSIONS_ROOT / f"{session_id}.jsonl"


@dataclass
class TwinMeta:
    session_id: str
    voice_profile_id: str | None
    created_at: str
    updated_at: str


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_meta(meta: TwinMeta) -> TwinMeta:
    ensure_sessions_root()
    meta_path(meta.session_id).write_text(
        json.dumps(
            {
                "session_id": meta.session_id,
                "voice_profile_id": meta.voice_profile_id,
                "created_at": meta.created_at,
                "updated_at": meta.updated_at,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return meta


def read_meta(session_id: str) -> TwinMeta | None:
    p = meta_path(session_id)
    if not p.exists():
        return None
    raw = json.loads(p.read_text(encoding="utf-8"))
    return TwinMeta(
        session_id=raw["session_id"],
        voice_profile_id=raw.get("voice_profile_id"),
        created_at=raw["created_at"],
        updated_at=raw["updated_at"],
    )


def list_recent_sessions(limit: int = 20) -> list[TwinMeta]:
    ensure_sessions_root()
    pairs: list[tuple[float, TwinMeta]] = []
    for p in SESSIONS_ROOT.glob("*.json"):
        try:
            m = read_meta(p.stem)
            if m:
                pairs.append((p.stat().st_mtime, m))
        except Exception:
            continue
    pairs.sort(key=lambda x: x[0], reverse=True)
    return [m for _, m in pairs[:limit]]


def append_message(session_id: str, record: dict) -> None:
    ensure_sessions_root()
    line = json.dumps(record, ensure_ascii=False, default=str)
    with log_path(session_id).open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def read_messages(session_id: str, *, max_turns: int = 80) -> list[dict]:
    p = log_path(session_id)
    if not p.exists():
        return []
    lines = p.read_text(encoding="utf-8").splitlines()
    out: list[dict] = []
    for line in lines[-max_turns:]:
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def delete_session(session_id: str) -> bool:
    mp = meta_path(session_id)
    lp = log_path(session_id)
    ok = False
    if mp.exists():
        mp.unlink()
        ok = True
    if lp.exists():
        lp.unlink()
        ok = True
    return ok

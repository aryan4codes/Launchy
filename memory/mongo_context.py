"""Optional MongoDB sync for creator voice data — Twin can search chunks for extra context."""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

from voice.schema import VoiceProfile

_LOG = logging.getLogger(__name__)

_mongo_client = None


def _get_mongo_client():  # type: ignore[no-untyped-def]
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client
    try:
        from pymongo import MongoClient
    except ImportError:
        return None
    uri = os.getenv("MONGODB_URI", "").strip()
    timeout_ms = int(os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "5000"))
    _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=timeout_ms)
    return _mongo_client


def mongodb_configured() -> bool:
    return bool((os.getenv("MONGODB_URI") or "").strip())


def _db_name() -> str:
    return (os.getenv("MONGODB_DATABASE") or "LAUNCHY").strip() or "launchy"


def _collection_name() -> str:
    return (os.getenv("MONGODB_VOICE_COLLECTION") or "launchy-voice-twin").strip() or "launchy-voice-twin"


def _get_collection():  # type: ignore[no-untyped-def]
    if not mongodb_configured():
        return None
    client = _get_mongo_client()
    if client is None:
        _LOG.warning("pymongo not installed; run uv sync (includes pymongo)")
        return None
    return client[_db_name()][_collection_name()]


def profile_to_chunks(profile: VoiceProfile) -> list[dict[str, Any]]:
    """Flatten profile into searchable snippets (captions, transcripts, rules)."""
    chunks: list[dict[str, Any]] = [
        {"kind": "summary_block", "text": profile.summary_block},
        {"kind": "sentence_style", "text": profile.sentence_style},
    ]
    if profile.tone_descriptors:
        chunks.append({"kind": "tone_descriptors", "text": ", ".join(profile.tone_descriptors)})
    if profile.vocabulary_signature:
        chunks.append({"kind": "vocabulary_signature", "text": ", ".join(profile.vocabulary_signature)})
    if profile.delivery_style:
        chunks.append({"kind": "delivery_style", "text": profile.delivery_style})
    for i, line in enumerate(profile.do_list, 1):
        chunks.append({"kind": "do_rule", "index": i, "text": line})
    for i, line in enumerate(profile.dont_list, 1):
        chunks.append({"kind": "dont_rule", "index": i, "text": line})
    for i, hook in enumerate(profile.example_hooks, 1):
        chunks.append({"kind": "example_hook", "index": i, "text": hook})
    for t in profile.transcriptions:
        cap = (t.caption or "").strip()
        tr = (t.transcript or "").strip()
        base = {"reel_index": t.reel_index, "shortcode": t.shortcode}
        if cap:
            chunks.append({**base, "kind": "reel_caption", "text": cap})
        if tr:
            chunks.append({**base, "kind": "reel_transcript", "text": tr})
    return chunks


def _tokenize(q: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9]{2,}", q.lower()) if len(w) >= 2]


def rank_chunks(chunks: list[dict[str, Any]], query: str, *, limit: int = 8) -> list[dict[str, Any]]:
    """Lightweight lexical ranker (no Atlas Search). Good for modest chunk counts."""
    tokens = _tokenize(query)
    if not tokens:
        return chunks[:limit]

    def score(ch: dict[str, Any]) -> float:
        text = str(ch.get("text") or "").lower()
        if not text:
            return 0.0
        hits = sum(1 for t in tokens if t in text)
        return hits / max(len(tokens), 1)

    ranked = sorted(chunks, key=score, reverse=True)
    top = [c for c in ranked if score(c) > 0][:limit]
    return top if top else ranked[:limit]


def upsert_voice_profile(profile: VoiceProfile) -> None:
    coll = _get_collection()
    if coll is None:
        return
    now = datetime.now(timezone.utc)
    doc = {
        "_id": profile.profile_id,
        "profile_id": profile.profile_id,
        "creator_name": profile.creator_name,
        "updated_at": now,
        "voice_snapshot": profile.model_dump(mode="json"),
        "chunks": profile_to_chunks(profile),
    }
    coll.replace_one({"_id": profile.profile_id}, doc, upsert=True)


def delete_voice_profile(profile_id: str) -> None:
    coll = _get_collection()
    if coll is None:
        return
    coll.delete_one({"_id": profile_id})


def search_voice_context(profile_id: str, query: str, *, limit: int = 8) -> str:
    """Return formatted top chunks for the Twin tool."""
    coll = _get_collection()
    if coll is None:
        return (
            "MongoDB is not configured. Set MONGODB_URI (and optionally MONGODB_DATABASE / "
            "MONGODB_VOICE_COLLECTION) on the API server, then re-save the voice profile."
        )
    doc = coll.find_one({"_id": profile_id})
    if not doc:
        return (
            f"No MongoDB document for profile_id={profile_id}. "
            "Save or re-profile the voice once with Mongo enabled to sync chunks."
        )
    chunks: list[dict[str, Any]] = list(doc.get("chunks") or [])
    if not chunks:
        return "MongoDB document exists but has no searchable chunks."
    top = rank_chunks(chunks, query, limit=limit)
    lines = [
        f"MongoDB creator knowledge (profile: {doc.get('creator_name', '')}, query: {query!r})",
        "---",
    ]
    for ch in top:
        kind = ch.get("kind", "snippet")
        body = str(ch.get("text") or "").strip()
        if not body:
            continue
        meta = []
        if ch.get("shortcode"):
            meta.append(f"shortcode={ch['shortcode']}")
        if ch.get("reel_index") is not None:
            meta.append(f"reel={ch['reel_index']}")
        tag = f"[{kind}" + (f", {', '.join(meta)}]" if meta else "]")
        lines.append(f"{tag}\n{body[:2400]}")
    return "\n\n".join(lines)


def try_sync_voice_profile(profile: VoiceProfile) -> None:
    if not mongodb_configured():
        return
    try:
        upsert_voice_profile(profile)
    except Exception:
        _LOG.exception("MongoDB upsert failed for profile %s", profile.profile_id)


def try_delete_voice_profile(profile_id: str) -> None:
    if not mongodb_configured():
        return
    try:
        delete_voice_profile(profile_id)
    except Exception:
        _LOG.exception("MongoDB delete failed for profile %s", profile_id)

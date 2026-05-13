"""File-backed voice profile storage under voice/profiles/."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from voice.schema import ReelTranscription, VoiceProfile, VoiceProfilerLLMOutput


def profiles_dir() -> Path:
    root = Path(__file__).resolve().parent / "profiles"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _path(profile_id: str) -> Path:
    safe = profile_id.replace("/", "").replace("..", "")
    return profiles_dir() / f"{safe}.json"


def save_profile(profile: VoiceProfile) -> VoiceProfile:
    path = _path(profile.profile_id)
    path.write_text(
        json.dumps(profile.model_dump(mode="json"), indent=2),
        encoding="utf-8",
    )
    return profile


def load_profile(profile_id: str) -> VoiceProfile:
    path = _path(profile_id)
    if not path.exists():
        raise FileNotFoundError(profile_id)
    raw = json.loads(path.read_text(encoding="utf-8"))
    return VoiceProfile.model_validate(raw)


def list_profiles() -> list[VoiceProfile]:
    out: list[VoiceProfile] = []
    for p in sorted(profiles_dir().glob("*.json")):
        try:
            raw = json.loads(p.read_text(encoding="utf-8"))
            out.append(VoiceProfile.model_validate(raw))
        except Exception:
            continue
    out.sort(key=lambda x: x.updated_at, reverse=True)
    return out


def delete_profile(profile_id: str) -> bool:
    path = _path(profile_id)
    if not path.exists():
        return False
    path.unlink()
    return True


def build_voice_profile(
    draft: VoiceProfilerLLMOutput,
    *,
    sample_count: int,
    profile_id: str | None = None,
    created_at: str | None = None,
    updated_at: str | None = None,
    transcriptions: list[dict] | None = None,
) -> VoiceProfile:
    now = datetime.now(timezone.utc).isoformat()
    pid = profile_id or str(uuid.uuid4())
    ca = created_at or now
    ua = updated_at or now
    parsed_trans = [ReelTranscription.model_validate(t) for t in (transcriptions or [])]
    return VoiceProfile(
        profile_id=pid,
        created_at=ca,
        updated_at=ua,
        sample_count=sample_count,
        creator_name=draft.creator_name,
        tone_descriptors=draft.tone_descriptors,
        vocabulary_signature=draft.vocabulary_signature,
        sentence_style=draft.sentence_style,
        do_list=draft.do_list,
        dont_list=draft.dont_list,
        example_hooks=draft.example_hooks,
        delivery_style=draft.delivery_style,
        summary_block=draft.summary_block,
        transcriptions=parsed_trans,
    )

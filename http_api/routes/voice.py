"""CRUD API for creator voice profiles."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agents.voice_profiler import run_voice_profiler
from voice.schema import VoiceProfile
from voice import sources as voice_sources
from voice.store import (
    build_voice_profile,
    delete_profile,
    list_profiles,
    load_profile,
    save_profile,
)

router = APIRouter()


class VoiceSampleRow(BaseModel):
    kind: str = Field(default="text")
    value: str = ""


class CreateVoiceProfileRequest(BaseModel):
    creator_name: str = Field(min_length=1, max_length=200)
    samples: list[VoiceSampleRow] = Field(default_factory=list)


class UpdateVoiceProfileRequest(BaseModel):
    creator_name: str | None = Field(default=None, max_length=200)
    samples: list[VoiceSampleRow] | None = None


class VoiceProfilePatchRequest(BaseModel):
    """Manual edits without re-profiling."""

    do_list: list[str] | None = None
    dont_list: list[str] | None = None


@router.get("/profiles", response_model=list[VoiceProfile])
def profiles_list() -> list[VoiceProfile]:
    return list_profiles()


@router.get("/profiles/{profile_id}", response_model=VoiceProfile)
def profiles_get(profile_id: str) -> VoiceProfile:
    try:
        return load_profile(profile_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="profile not found") from None


@router.post("/profiles", response_model=VoiceProfile)
def profiles_create(body: CreateVoiceProfileRequest) -> VoiceProfile:
    texts, row_count = voice_sources.collect_sample_texts(
        [r.model_dump() for r in body.samples],
        creator_name=body.creator_name,
    )
    if not texts:
        raise HTTPException(
            status_code=422,
            detail="At least one non-empty sample (text, url, or reddit_user) is required.",
        )
    draft = run_voice_profiler(creator_name=body.creator_name, sample_texts=texts)
    profile = build_voice_profile(draft, sample_count=row_count)
    return save_profile(profile)


@router.put("/profiles/{profile_id}", response_model=VoiceProfile)
def profiles_update(profile_id: str, body: UpdateVoiceProfileRequest) -> VoiceProfile:
    try:
        existing = load_profile(profile_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="profile not found") from None

    name = body.creator_name if body.creator_name is not None else existing.creator_name
    if body.samples is None:
        return existing

    texts, row_count = voice_sources.collect_sample_texts(
        [r.model_dump() for r in body.samples],
        creator_name=name,
    )
    if not texts:
        raise HTTPException(
            status_code=422,
            detail="At least one non-empty sample (text, url, or reddit_user) is required.",
        )
    draft = run_voice_profiler(creator_name=name, sample_texts=texts)
    now = datetime.now(timezone.utc).isoformat()
    profile = build_voice_profile(
        draft,
        sample_count=row_count,
        profile_id=existing.profile_id,
        created_at=existing.created_at,
        updated_at=now,
    )
    return save_profile(profile)


@router.patch("/profiles/{profile_id}", response_model=VoiceProfile)
def profiles_patch(profile_id: str, body: VoiceProfilePatchRequest) -> VoiceProfile:
    try:
        p = load_profile(profile_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="profile not found") from None
    data = p.model_dump()
    if body.do_list is not None:
        data["do_list"] = body.do_list
    if body.dont_list is not None:
        data["dont_list"] = body.dont_list
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    updated = VoiceProfile.model_validate(data)
    return save_profile(updated)


@router.delete("/profiles/{profile_id}")
def profiles_remove(profile_id: str) -> dict[str, bool]:
    ok = delete_profile(profile_id)
    if not ok:
        raise HTTPException(status_code=404, detail="profile not found")
    return {"ok": True}

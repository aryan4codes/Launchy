"""CRUD API for creator voice profiles."""

from __future__ import annotations

import asyncio
import json
import queue
import threading
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse

from agents.voice_profiler import run_voice_profiler
from memory.mongo_context import try_delete_voice_profile, try_sync_voice_profile
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
    texts, row_count, transcriptions = voice_sources.collect_sample_texts(
        [r.model_dump() for r in body.samples],
        creator_name=body.creator_name,
    )
    if not texts:
        raise HTTPException(
            status_code=422,
            detail="At least one non-empty sample (text, url, reddit_user, or instagram_profile) is required.",
        )
    draft = run_voice_profiler(creator_name=body.creator_name, sample_texts=texts)
    profile = build_voice_profile(draft, sample_count=row_count, transcriptions=transcriptions)
    saved = save_profile(profile)
    try_sync_voice_profile(saved)
    return saved


@router.post("/profiles/stream")
async def profiles_create_stream(body: CreateVoiceProfileRequest) -> StreamingResponse:
    """SSE endpoint — streams progress events then emits the finished profile as {type:'done', profile:{...}}."""
    q: queue.Queue[tuple[str, Any]] = queue.Queue()

    def on_progress(evt: dict[str, Any]) -> None:
        q.put(("event", evt))

    def run_in_thread() -> None:
        try:
            on_progress({"type": "step", "step": "init", "msg": "Starting voice analysis…"})
            texts, row_count, transcriptions = voice_sources.collect_sample_texts(
                [r.model_dump() for r in body.samples],
                creator_name=body.creator_name,
                on_progress=on_progress,
            )
            if not texts:
                q.put(("error", "At least one non-empty sample is required."))
                return
            source_label = f"{len(texts)} source{'s' if len(texts) != 1 else ''} collected"
            on_progress({
                "type": "step",
                "step": "profiling",
                "msg": f"Analyzing voice patterns with AI ({source_label})…",
            })
            draft = run_voice_profiler(creator_name=body.creator_name, sample_texts=texts)
            profile = build_voice_profile(draft, sample_count=row_count, transcriptions=transcriptions)
            saved = save_profile(profile)
            try_sync_voice_profile(saved)
            q.put(("done", saved.model_dump(mode="json")))
        except Exception as e:  # noqa: BLE001
            q.put(("error", str(e)))

    thread = threading.Thread(target=run_in_thread, daemon=True)
    thread.start()

    async def generate():
        loop = asyncio.get_event_loop()
        while True:
            try:
                item: tuple[str, Any] = await loop.run_in_executor(
                    None, lambda: q.get(timeout=2)
                )
            except queue.Empty:
                if not thread.is_alive():
                    break
                # heartbeat so the connection stays alive during long ops
                yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                continue

            kind, data = item
            if kind == "event":
                yield f"data: {json.dumps(data)}\n\n"
            elif kind == "done":
                yield f"data: {json.dumps({'type': 'done', 'profile': data})}\n\n"
                break
            elif kind == "error":
                yield f"data: {json.dumps({'type': 'error', 'detail': str(data)})}\n\n"
                break

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.put("/profiles/{profile_id}", response_model=VoiceProfile)
def profiles_update(profile_id: str, body: UpdateVoiceProfileRequest) -> VoiceProfile:
    try:
        existing = load_profile(profile_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="profile not found") from None

    name = body.creator_name if body.creator_name is not None else existing.creator_name
    if body.samples is None:
        return existing

    texts, row_count, transcriptions = voice_sources.collect_sample_texts(
        [r.model_dump() for r in body.samples],
        creator_name=name,
    )
    if not texts:
        raise HTTPException(
            status_code=422,
            detail="At least one non-empty sample (text, url, reddit_user, or instagram_profile) is required.",
        )
    draft = run_voice_profiler(creator_name=name, sample_texts=texts)
    now = datetime.now(timezone.utc).isoformat()
    profile = build_voice_profile(
        draft,
        sample_count=row_count,
        profile_id=existing.profile_id,
        created_at=existing.created_at,
        updated_at=now,
        transcriptions=transcriptions,
    )
    saved = save_profile(profile)
    try_sync_voice_profile(saved)
    return saved


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
    saved = save_profile(updated)
    try_sync_voice_profile(saved)
    return saved


@router.delete("/profiles/{profile_id}")
def profiles_remove(profile_id: str) -> dict[str, bool]:
    ok = delete_profile(profile_id)
    if not ok:
        raise HTTPException(status_code=404, detail="profile not found")
    try_delete_voice_profile(profile_id)
    return {"ok": True}

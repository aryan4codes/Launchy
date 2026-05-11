"""Twin chat REST + SSE endpoints."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agents.twin_agent import stream_twin_turn
from tools.twin_tools import TwinToolContext
from twin.session import (
    TwinMeta,
    append_message,
    delete_session,
    list_recent_sessions,
    read_messages,
    read_meta,
    utc_now,
    write_meta,
)

router = APIRouter()


class TwinSessionCreate(BaseModel):
    voice_profile_id: str | None = None


class TwinMessageCreate(BaseModel):
    content: str = Field(min_length=1)
    tool_memory: bool = True
    tool_research: bool = True
    tool_workflow: bool = True


class TwinSessionPatch(BaseModel):
    voice_profile_id: str | None = None


@router.post("/sessions")
def create_session(body: TwinSessionCreate) -> dict:
    sid = str(uuid.uuid4())
    now = utc_now()
    meta = TwinMeta(
        session_id=sid,
        voice_profile_id=body.voice_profile_id,
        created_at=now,
        updated_at=now,
    )
    write_meta(meta)
    return {"session_id": sid, **body.model_dump()}


@router.get("/sessions")
def list_sessions(limit: int = 20) -> list[dict]:
    metas = list_recent_sessions(limit=limit)
    return [
        {
            "session_id": m.session_id,
            "voice_profile_id": m.voice_profile_id,
            "created_at": m.created_at,
            "updated_at": m.updated_at,
        }
        for m in metas
    ]


@router.get("/sessions/{session_id}")
def get_session(session_id: str) -> dict:
    meta = read_meta(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail="session not found")
    return {
        "meta": {
            "session_id": meta.session_id,
            "voice_profile_id": meta.voice_profile_id,
            "created_at": meta.created_at,
            "updated_at": meta.updated_at,
        },
        "messages": read_messages(session_id, max_turns=500),
    }


@router.patch("/sessions/{session_id}")
def patch_session(session_id: str, body: TwinSessionPatch) -> dict:
    meta = read_meta(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail="session not found")
    data = body.model_dump(exclude_unset=True)
    if "voice_profile_id" not in data:
        return {"ok": True, "voice_profile_id": meta.voice_profile_id}
    meta = TwinMeta(
        session_id=meta.session_id,
        voice_profile_id=data["voice_profile_id"],
        created_at=meta.created_at,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    write_meta(meta)
    return {"ok": True, "voice_profile_id": meta.voice_profile_id}


@router.delete("/sessions/{session_id}")
def remove_session(session_id: str) -> dict:
    if not delete_session(session_id):
        raise HTTPException(status_code=404, detail="session not found")
    return {"ok": True}


@router.post("/sessions/{session_id}/messages")
async def post_message_sse(session_id: str, body: TwinMessageCreate) -> StreamingResponse:
    meta = read_meta(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail="session not found")

    append_message(session_id, {"role": "user", "content": body.content.strip()})

    refreshed = TwinMeta(
        session_id=meta.session_id,
        voice_profile_id=meta.voice_profile_id,
        created_at=meta.created_at,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    write_meta(refreshed)

    tctx = TwinToolContext(
        voice_profile_id=meta.voice_profile_id,
        tool_memory=body.tool_memory,
        tool_research=body.tool_research,
        tool_workflow=body.tool_workflow,
    )

    async def event_gen():
        async for ev in stream_twin_turn(session_id=session_id, twin_ctx=tctx):
            yield f"data: {json.dumps(ev, default=str)}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")

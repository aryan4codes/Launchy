"""Memory entry schema aligned with PRD §7.2 (stored in ChromaDB metadata + document text)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ContentMemoryEntry(BaseModel):
    content_id: str
    topic: str
    hook: str
    platform: str
    angle: str
    predicted_score: int = Field(ge=0, le=100)
    actual_likes: int | None = None
    actual_shares: int | None = None
    actual_comments: int | None = None
    delta: float | None = None
    run_id: str
    created_at: str

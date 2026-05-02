"""Run configuration and result models."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Platform = Literal["twitter", "linkedin", "instagram"]


def default_platforms() -> list[str]:
    return ["twitter", "linkedin"]


class ContentPiece(BaseModel):
    content_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    run_id: str
    trend: str
    angle: str
    platform: str
    variation_number: int = Field(ge=1)
    body: str
    creative_brief: str
    predicted_score: int = Field(ge=0, le=100)
    score_reasoning: str
    recommended: bool = False
    image_path: str | None = None


class RunSummary(BaseModel):
    total_pieces: int = 0
    platform_breakdown: dict[str, int] = Field(default_factory=dict)
    top_trends: list[str] = Field(default_factory=list)
    memory_entries_written: int = 0
    memory_queries_performed: int = 0


def default_subreddit_csv(_niche: str) -> str:
    """Fallback subs when the user omits `--subreddits`.

    Intentionally niche-agnostic — no vertical keyword routing. Prefer passing explicit
    subreddits for precision; Serper queries keyed to `{niche}` carry most of the focus.
    """
    return "AskReddit,todayilearned,LifeProTips"


class RunConfig(BaseModel):
    niche: str
    subreddits: list[str] | None = None
    platforms: list[str] = Field(default_factory=default_platforms)
    angles: int = Field(default=5, ge=1, le=10)
    variations: int = Field(default=2, ge=1, le=10)
    top_k_memory: int = Field(default=5, ge=1, le=20)
    include_instagram: bool = False
    run_id: str | None = None

    def resolved_run_id(self) -> str:
        return self.run_id or str(uuid.uuid4())

    def resolved_subreddits_csv(self) -> str:
        if self.subreddits:
            return ",".join(self.subreddits)
        return default_subreddit_csv(self.niche)


class RunResult(BaseModel):
    success: bool
    run_id: str
    pieces: list[ContentPiece] = Field(default_factory=list)
    summary: RunSummary | None = None
    raw_output: str | None = None
    error: str | None = None


class CrewFinalPiece(BaseModel):
    """LLM-facing schema for OpenAI structured output — flat, all-required keys."""

    model_config = ConfigDict(extra="forbid")

    content_id: str
    trend: str
    angle: str
    platform: str
    variation_number: int = Field(ge=1)
    body: str
    creative_brief: str
    predicted_score: int = Field(ge=0, le=100)
    score_reasoning: str
    recommended: bool


class CrewFinalOutput(BaseModel):
    """Structured output for CrewAI final task. Summary is computed in Python, not by the LLM."""

    model_config = ConfigDict(extra="forbid")

    pieces: list[CrewFinalPiece]


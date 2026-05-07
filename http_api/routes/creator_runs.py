"""Creator-facing entrypoint: map a simple brief to a stored workflow + inputs."""

from __future__ import annotations

import re
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from http_api.routes.workflow_runs import schedule_workflow_run
from http_api.workflow_storage import clone_template

router = APIRouter()

_TEMPLATE_WITH_IMAGES = "launchy_virality_plus_images"
_TEMPLATE_NO_IMAGES = "launchy_virality"


class CreatorRunCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str = Field(min_length=1, max_length=500)
    create_images: bool = False
    audience: str | None = Field(default=None, max_length=2000)
    creator_persona: str | None = Field(
        default=None,
        max_length=8000,
        description="Free-text taste, boundaries, and perspective for the creator voice.",
    )
    tone_traits: list[str] = Field(default_factory=list)
    content_formats: list[str] = Field(default_factory=list)
    platforms: str | None = Field(
        default="TikTok, Instagram, LinkedIn, X",
        max_length=500,
    )
    instagram_url: str | None = Field(default=None, max_length=500)
    prior_context: str | None = Field(
        default=None,
        max_length=12000,
        description="Optional summaries from past runs (browser-saved); merged into creator brief.",
    )


def _instagram_from_url(url: str | None) -> tuple[bool, str | None, str | None]:
    """Return (consent, username, profile_url_or_none)."""
    if not url or not url.strip():
        return False, None, None
    raw = url.strip()
    username: str | None = None
    display_url = raw
    if not raw.startswith("http"):
        display_url = f"https://{raw}" if "instagram.com" in raw.lower() else raw

    if "instagram.com" in raw.lower():
        parsed = urlparse(display_url if display_url.startswith("http") else f"https://{raw}")
        parts = [p for p in parsed.path.strip("/").split("/") if p]
        skip = {"p", "reel", "reels", "stories", "explore"}
        if parts and parts[0].lower() not in skip:
            username = parts[0].lstrip("@")
    else:
        username = raw.lstrip("@").split("/")[0].strip() or None

    if username:
        username = re.sub(r"[^A-Za-z0-9._]", "", username)
    if not username:
        return False, None, raw

    return True, username, raw if raw.startswith("http") else None


def _build_workflow_inputs(body: CreatorRunCreate) -> dict[str, object]:
    consent, ig_user, ig_url = _instagram_from_url(body.instagram_url)
    tones = ", ".join(t.strip() for t in body.tone_traits if t.strip())
    formats = ", ".join(f.strip() for f in body.content_formats if f.strip())
    base_persona = body.creator_persona.strip() if body.creator_persona else ""
    prior = body.prior_context.strip() if body.prior_context else ""
    if prior:
        block = f"\n\n--- Context from your saved Launchy memory ---\n{prior}"
        creator_persona = f"{base_persona}{block}" if base_persona else block.lstrip()
    else:
        creator_persona = base_persona
    return {
        "topic": body.topic.strip(),
        "platforms": body.platforms.strip() if body.platforms else "TikTok, Instagram, LinkedIn, X",
        "audience": body.audience.strip() if body.audience else "",
        "creator_persona": creator_persona,
        "tone_traits": tones,
        "content_formats": formats,
        "instagram_profile_consent": consent,
        "instagram_username": ig_user or "",
        "instagram_profile_url": ig_url or "",
    }


@router.post("")
async def start_creator_run(body: CreatorRunCreate) -> dict[str, str]:
    template_id = _TEMPLATE_WITH_IMAGES if body.create_images else _TEMPLATE_NO_IMAGES
    name = f"Creator: {body.topic.strip()[:56]}"
    try:
        spec = clone_template(template_id, name=name)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"workflow template missing: {template_id}") from None

    workflow_id = spec.id or ""
    if not workflow_id:
        raise HTTPException(status_code=500, detail="cloned workflow missing id")

    inputs = _build_workflow_inputs(body)
    run_id = schedule_workflow_run(spec, inputs)
    return {"run_id": run_id, "workflow_id": workflow_id}

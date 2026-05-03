"""Leonardo GPT Image 2 payload builder (kept separate from FLUX/Nano logic)."""

from __future__ import annotations

from typing import Any

from workflow.schema import OpenAIImageParams

_GPT_IMAGE_2_MODEL = "gpt-image-2"
_DEFAULT_GPT_IMAGE_2_QUALITY = "MEDIUM"
_ALLOWED_QUALITY = {"LOW", "MEDIUM", "HIGH"}


def _normalize_quality(raw: str | None) -> str:
    value = (raw or _DEFAULT_GPT_IMAGE_2_QUALITY).strip().upper()
    if value in _ALLOWED_QUALITY:
        return value
    return _DEFAULT_GPT_IMAGE_2_QUALITY


def build_gpt_image_2_submission(
    *,
    prompt: str,
    params: OpenAIImageParams,
) -> tuple[dict[str, Any], str]:
    body_params: dict[str, Any] = {
        "prompt": prompt,
        "quantity": int(params.num_images),
        "width": int(params.width),
        "height": int(params.height),
        "prompt_enhance": "ON" if bool(params.enhance_prompt) else "OFF",
        "quality": _normalize_quality(params.quality),
    }
    if params.seed is not None:
        body_params["seed"] = int(params.seed)
    return {
        "public": False,
        "model": _GPT_IMAGE_2_MODEL,
        "parameters": body_params,
    }, _GPT_IMAGE_2_MODEL

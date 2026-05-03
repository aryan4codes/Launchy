"""Leonardo image generation (FLUX Dev + Nano Banana 2 + GPT Image 2); saves PNG artifacts."""

from __future__ import annotations

import base64
import io
import logging
import os
import time
from pathlib import Path
from typing import Any

from PIL import Image
import requests

from workflow.context import NodeExecContext
from workflow.nodes.leonardo_gpt_image2 import build_gpt_image_2_submission
from workflow.render import merge_context, render_template
from workflow.schema import OpenAIImageParams

_LOG = logging.getLogger(__name__)
_LEONARDO_V1_BASE = "https://cloud.leonardo.ai/api/rest/v1"
_LEONARDO_V2_BASE = "https://cloud.leonardo.ai/api/rest/v2"
_DEFAULT_FLUX_DEV_MODEL_ID = "b2614463-296c-462a-9586-aafdb8f00e36"
_NANO_BANANA_2_MODEL = "nano-banana-2"
_NANO_DEFAULT_STYLE_UUID = "111dc692-d470-4eec-b791-3475abac4c46"
_LEONARDO_V1_PROMPT_MAX_CHARS = 1500
_VISUAL_GUARDRAIL_SUFFIX = (
    " Keep any on-image text minimal and only when essential. "
    "Prioritize coherent composition and strong visuals over typography, and avoid gibberish lettering."
)


def _persist_pngs(ctx: NodeExecContext, blobs: list[bytes]) -> list[str]:
    out_dir = ctx.outputs_base / "images"
    out_dir.mkdir(parents=True, exist_ok=True)
    imgs: list[str] = []
    for idx, data in enumerate(blobs):
        fname = f"{ctx.node.id}_{idx}.png"
        dst = out_dir / fname
        img = Image.open(io.BytesIO(data))
        img.save(dst, format="PNG")
        rel_key = Path(ctx.run_id) / "images" / fname
        imgs.append(rel_key.as_posix())
    return imgs


def _images_from_response_payload(payload: Any) -> list[bytes]:
    blobs: list[bytes] = []
    candidates: list[dict[str, Any]] = []

    roots: list[dict[str, Any]] = []
    if isinstance(payload, dict):
        roots = [payload]
    elif isinstance(payload, list):
        roots = [x for x in payload if isinstance(x, dict)]

    for root in roots:
        primary = root.get("generated_images")
        if isinstance(primary, list):
            candidates.extend([x for x in primary if isinstance(x, dict)])
        nested = (
            root.get("generations_by_pk", {}).get("generated_images")
            if isinstance(root.get("generations_by_pk"), dict)
            else None
        )
        if isinstance(nested, list):
            candidates.extend([x for x in nested if isinstance(x, dict)])
        generation = root.get("generation")
        if isinstance(generation, dict):
            for key in ("generated_images", "generatedImages"):
                gi = generation.get(key)
                if isinstance(gi, list):
                    candidates.extend([x for x in gi if isinstance(x, dict)])
        data = root.get("data")
        if isinstance(data, dict):
            for key in ("generated_images", "generatedImages"):
                gi = data.get(key)
                if isinstance(gi, list):
                    candidates.extend([x for x in gi if isinstance(x, dict)])
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    gi = item.get("generated_images")
                    if isinstance(gi, list):
                        candidates.extend([x for x in gi if isinstance(x, dict)])

    for item in candidates:
        b64 = item.get("b64_json") or item.get("b64Json")
        if b64:
            blobs.append(base64.b64decode(b64))
            continue
        url = (
            item.get("url")
            or item.get("presignedUrl")
            or item.get("presigned_url")
            or item.get("imageUrl")
            or item.get("image_url")
        )
        if url:
            resp = requests.get(url, timeout=120)
            resp.raise_for_status()
            blobs.append(resp.content)
    return blobs


def _optional_api_kw_flux(p: OpenAIImageParams, template_ctx: dict[str, Any]) -> dict[str, Any]:
    kw: dict[str, Any] = {}
    if p.enhance_prompt_instruction and p.enhance_prompt:
        kw["enhancePromptInstruction"] = render_template(p.enhance_prompt_instruction, template_ctx)
    if p.seed is not None:
        kw["seed"] = int(p.seed)
    if p.ultra is not None:
        kw["ultra"] = bool(p.ultra)
    if p.style_uuid and str(p.style_uuid).strip():
        style_uuid = str(p.style_uuid).strip()
        if style_uuid == _NANO_DEFAULT_STYLE_UUID:
            _LOG.info("Ignoring Nano Banana style UUID for FLUX payload: %s", style_uuid)
        else:
            kw["styleUUID"] = style_uuid
    return kw


def _truncate_leonardo_v1_prompt(prompt: str, node_id: str) -> str:
    if len(prompt) <= _LEONARDO_V1_PROMPT_MAX_CHARS:
        return prompt
    trimmed = prompt[:_LEONARDO_V1_PROMPT_MAX_CHARS].rstrip()
    _LOG.warning(
        "Trimmed Leonardo v1 prompt from %d to %d chars for node %s",
        len(prompt),
        len(trimmed),
        node_id,
    )
    return trimmed


def _apply_visual_guardrail(prompt: str) -> str:
    if not prompt.strip():
        return _VISUAL_GUARDRAIL_SUFFIX.strip()
    lowered = prompt.lower()
    has_text_light = "text minimal" in lowered or "text-light" in lowered or "text light" in lowered
    has_visual_priority = "strong visuals" in lowered or "visual-first" in lowered or "coherent composition" in lowered
    has_gibberish_guard = "gibberish lettering" in lowered or "no gibberish text" in lowered
    if has_text_light and has_visual_priority and has_gibberish_guard:
        return prompt
    return f"{prompt.rstrip()} {_VISUAL_GUARDRAIL_SUFFIX.strip()}"


def _extract_generation_id_from_dict(payload: dict[str, Any]) -> str | None:
    for key in ("generationId", "generation_id", "id"):
        raw = payload.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
    job = payload.get("sdGenerationJob")
    if isinstance(job, dict):
        for key in ("generationId", "id"):
            raw = job.get(key)
            if isinstance(raw, str) and raw.strip():
                return raw.strip()
    generation = payload.get("generation")
    if isinstance(generation, dict):
        for key in ("generationId", "generation_id", "id"):
            raw = generation.get(key)
            if isinstance(raw, str) and raw.strip():
                return raw.strip()
    data = payload.get("data")
    if isinstance(data, dict):
        for key in ("generationId", "generation_id", "id"):
            raw = data.get(key)
            if isinstance(raw, str) and raw.strip():
                return raw.strip()
    return None


def _extract_generation_id(payload: Any) -> str | None:
    if isinstance(payload, dict):
        return _extract_generation_id_from_dict(payload)
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                maybe = _extract_generation_id_from_dict(item)
                if maybe:
                    return maybe
    return None


def _poll_generation(
    headers: dict[str, str],
    poll_base_url: str,
    generation_id: str,
    timeout_s: int,
) -> tuple[dict[str, Any], list[bytes] | None]:
    deadline = time.time() + timeout_s
    last_payload: dict[str, Any] | None = None
    while time.time() < deadline:
        resp = requests.get(f"{poll_base_url}/generations/{generation_id}", headers=headers, timeout=60)
        resp.raise_for_status()
        payload = resp.json() or {}
        last_payload = payload

        status = ""
        for candidate in (
            payload.get("status"),
            payload.get("state"),
            payload.get("generations_by_pk", {}).get("status")
            if isinstance(payload.get("generations_by_pk"), dict)
            else None,
            payload.get("generation", {}).get("status")
            if isinstance(payload.get("generation"), dict)
            else None,
            payload.get("generation", {}).get("state")
            if isinstance(payload.get("generation"), dict)
            else None,
            payload.get("data", {}).get("status")
            if isinstance(payload.get("data"), dict)
            else None,
            payload.get("data", {}).get("state")
            if isinstance(payload.get("data"), dict)
            else None,
            payload.get("sdGenerationJob", {}).get("status")
            if isinstance(payload.get("sdGenerationJob"), dict)
            else None,
        ):
            if isinstance(candidate, str) and candidate.strip():
                status = candidate.strip().upper()
                break

        maybe_blobs = _images_from_response_payload(payload)
        if maybe_blobs:
            return payload, maybe_blobs
        if status in {"COMPLETE", "COMPLETED", "FINISHED"}:
            return payload, None
        if status in {"FAILED", "ERROR", "CANCELED", "CANCELLED"}:
            raise RuntimeError(f"Leonardo generation failed for id={generation_id} (status={status}).")

        time.sleep(1.5)

    raise TimeoutError(
        f"Timed out waiting for Leonardo generation id={generation_id} "
        f"after {timeout_s}s. Last payload keys={sorted((last_payload or {}).keys())}."
    )


def run_openai_image_node(ctx: NodeExecContext, p: OpenAIImageParams) -> dict[str, Any]:
    template_ctx = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    prompt = render_template(p.prompt_template, template_ctx)
    prompt_for_submit = _apply_visual_guardrail(prompt)
    selected_model = (p.image_model or "flux_dev").strip().lower()
    legacy_model = (p.model or "").strip()
    model_id = (p.model_id or legacy_model or _DEFAULT_FLUX_DEV_MODEL_ID).strip()
    api_key = os.environ.get("LEONARDO_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("LEONARDO_API_KEY is required for media.gemini_image nodes.")

    headers = {
        "accept": "application/json",
        "authorization": f"Bearer {api_key}",
        "content-type": "application/json",
    }

    submit_url = ""
    poll_url = ""
    response_model = ""
    if selected_model == "nano_banana_2":
        params: dict[str, Any] = {
            "width": int(p.width),
            "height": int(p.height),
            "prompt": prompt_for_submit,
            "quantity": int(p.num_images),
            "prompt_enhance": "ON" if bool(p.enhance_prompt) else "OFF",
        }
        if p.style_uuid and str(p.style_uuid).strip():
            params["style_ids"] = [str(p.style_uuid).strip()]
        if p.seed is not None:
            params["seed"] = int(p.seed)
        body = {
            "model": _NANO_BANANA_2_MODEL,
            "parameters": params,
            "public": False,
        }
        submit_url = f"{_LEONARDO_V2_BASE}/generations"
        # v2 POST job status is polled via REST v1, which returns `generations_by_pk`
        # with `generated_images[].url`; v2 GET uses a different envelope we do not parse.
        poll_url = _LEONARDO_V1_BASE
        response_model = _NANO_BANANA_2_MODEL
    elif selected_model == "gpt_image_2":
        body, response_model = build_gpt_image_2_submission(prompt=prompt_for_submit, params=p)
        submit_url = f"{_LEONARDO_V2_BASE}/generations"
        poll_url = _LEONARDO_V1_BASE
    else:
        prompt_for_submit = _truncate_leonardo_v1_prompt(prompt_for_submit, ctx.node.id)
        body = {
            "modelId": model_id,
            "prompt": prompt_for_submit,
            "contrast": float(p.contrast),
            "num_images": int(p.num_images),
            "width": int(p.width),
            "height": int(p.height),
            "enhancePrompt": bool(p.enhance_prompt),
            **_optional_api_kw_flux(p, template_ctx),
        }
        submit_url = f"{_LEONARDO_V1_BASE}/generations"
        poll_url = _LEONARDO_V1_BASE
        response_model = model_id

    submit = requests.post(submit_url, headers=headers, json=body, timeout=90)
    try:
        submit.raise_for_status()
    except requests.HTTPError as exc:
        snippet = (submit.text or "").strip().replace("\n", " ")
        if len(snippet) > 700:
            snippet = snippet[:700] + "..."
        raise RuntimeError(
            "Leonardo submission failed "
            f"(node={ctx.node.id}, image_model={selected_model}, endpoint={submit_url}, "
            f"status={submit.status_code}, body={snippet!r})"
        ) from exc
    submit_payload = submit.json() or {}
    generation_id = _extract_generation_id(submit_payload)
    if generation_id:
        final_payload, prefetched_blobs = _poll_generation(
            headers,
            poll_url,
            generation_id,
            timeout_s=p.timeout_seconds,
        )
        blobs = prefetched_blobs if prefetched_blobs is not None else _images_from_response_payload(final_payload)
    else:
        final_payload = submit_payload
        blobs = _images_from_response_payload(final_payload)

    imgs = _persist_pngs(ctx, blobs)

    if not blobs:
        _LOG.warning("Leonardo returned no image bytes for node %s", ctx.node.id)

    primary = imgs[0] if imgs else None
    return {
        "prompt": prompt_for_submit,
        "images": imgs,
        "image_path": primary,
        "image_model": selected_model,
        "model_id": response_model,
        "provider": "leonardo",
        "text": primary or "",
        "num_images": int(p.num_images),
        "width": int(p.width),
        "height": int(p.height),
        "contrast": float(p.contrast),
    }

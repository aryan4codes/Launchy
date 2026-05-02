"""Gemini image generation via ``google-genai``; writes PNG artifacts under outputs."""

from __future__ import annotations

import base64
import io
import logging
import os
from pathlib import Path
from typing import Any

from PIL import Image

from workflow.context import NodeExecContext
from workflow.render import merge_context, render_template
from workflow.schema import GeminiImageParams

_LOG = logging.getLogger(__name__)


def _bytes_from_generate_content_response(response: Any) -> list[bytes]:
    out: list[bytes] = []
    cand0 = getattr(response, "candidates", None) or []
    parts: list[Any] = []
    if cand0:
        try:
            c0 = cand0[0]
            content = getattr(c0, "content", None)
            if content and getattr(content, "parts", None):
                parts.extend(list(content.parts))
        except IndexError:
            pass
    if hasattr(response, "parts") and response.parts:
        parts.extend(list(response.parts))
    for part in parts:
        inline = getattr(part, "inline_data", None)
        if inline is None and isinstance(part, dict):
            inline_obj = part.get("inline_data") or part.get("inlineData")
            if isinstance(inline_obj, dict):
                raw = inline_obj.get("data") or inline_obj.get("bytes")
                if isinstance(raw, str):
                    out.append(base64.b64decode(raw))
                elif isinstance(raw, bytes):
                    out.append(raw)
                continue
        if inline is not None:
            raw = getattr(inline, "data", None)
            if isinstance(raw, str):
                out.append(base64.b64decode(raw))
            elif isinstance(raw, bytes):
                out.append(raw)
            elif raw is not None:
                try:
                    out.append(bytes(raw))
                except Exception:
                    pass
    return out


def run_gemini_image_node(ctx: NodeExecContext, p: GeminiImageParams) -> dict[str, Any]:
    template_ctx = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    prompt = render_template(p.prompt_template, template_ctx)

    model = (p.model or "gemini-2.5-flash-image").strip()

    from google import genai

    api_key = os.environ.get("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key) if api_key else genai.Client()

    try:
        from google.genai import types as genai_types

        response = client.models.generate_content(
            model=model,
            contents=[prompt],
            config=genai_types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
        )
    except Exception:
        response = client.models.generate_content(model=model, contents=[prompt])

    blobs = _bytes_from_generate_content_response(response)
    out_dir = ctx.outputs_base / "images"
    out_dir.mkdir(parents=True, exist_ok=True)

    imgs: list[str] = []
    if not blobs:
        _LOG.warning("No inline image bytes in Gemini response for node %s", ctx.node.id)

    for idx, data in enumerate(blobs):
        fname = f"{ctx.node.id}_{idx}.png"
        dst = out_dir / fname
        Image.open(io.BytesIO(data)).save(dst, format="PNG")
        rel_key = Path(ctx.run_id) / "images" / fname
        imgs.append(rel_key.as_posix())

    primary = imgs[0] if imgs else None
    return {
        "prompt": prompt,
        "images": imgs,
        "image_path": primary,
        "model": model,
        "text": primary or "",
    }

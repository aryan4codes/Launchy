"""OpenAI Image API (`images.generate` / `images.edit`); saves PNG artifacts under outputs."""

from __future__ import annotations

import base64
import io
import logging
import urllib.request
from pathlib import Path
from typing import Any, BinaryIO

from openai import OpenAI
from PIL import Image

from workflow.context import NodeExecContext
from workflow.render import merge_context, render_template
from workflow.schema import OpenAIImageParams

_LOG = logging.getLogger(__name__)


def _resolve_path(raw: str) -> Path:
    raw = raw.strip()
    if not raw:
        raise ValueError("empty path segment")
    p = Path(raw)
    return p if p.is_absolute() else Path.cwd() / p


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


def _images_from_response(result: Any) -> list[bytes]:
    blobs: list[bytes] = []
    for item in result.data or []:
        b64 = getattr(item, "b64_json", None)
        if b64:
            blobs.append(base64.b64decode(b64))
            continue
        url = getattr(item, "url", None)
        if url:
            with urllib.request.urlopen(url, timeout=120) as resp:
                blobs.append(resp.read())
    return blobs


def _optional_api_kw(p: OpenAIImageParams) -> dict[str, Any]:
    kw: dict[str, Any] = {}
    if p.size and str(p.size).strip():
        kw["size"] = str(p.size).strip()
    if p.quality and str(p.quality).strip():
        kw["quality"] = str(p.quality).strip()
    return kw


def run_openai_image_node(ctx: NodeExecContext, p: OpenAIImageParams) -> dict[str, Any]:
    template_ctx = merge_context(ctx.workflow_inputs, ctx.upstream_outputs)
    prompt = render_template(p.prompt_template, template_ctx)
    model = (p.model or "gpt-image-2").strip()

    client = OpenAI()

    img_tpl = (p.input_images_template or "").strip()
    rendered_paths = render_template(img_tpl, template_ctx).strip() if img_tpl else ""
    segments = [s.strip() for s in rendered_paths.split("|") if s.strip()] if rendered_paths else []
    paths = [_resolve_path(s) for s in segments]
    for path in paths:
        if not path.is_file():
            raise FileNotFoundError(f"input image not found: {path}")

    mask_tpl = (p.mask_image_path_template or "").strip()
    mask_rendered = render_template(mask_tpl, template_ctx).strip() if mask_tpl else ""
    mask_path = _resolve_path(mask_rendered) if mask_rendered else None
    if mask_path is not None and not mask_path.is_file():
        raise FileNotFoundError(f"mask image not found: {mask_path}")

    blobs: list[bytes] = []
    extra = _optional_api_kw(p)

    if not paths:
        result = client.images.generate(model=model, prompt=prompt, **extra)
        blobs = _images_from_response(result)
    else:
        opened: list[BinaryIO] = []
        try:
            for path in paths:
                opened.append(path.open("rb"))
            if len(opened) == 1:
                img_arg: Any = opened[0]
            else:
                img_arg = opened
            kw: dict[str, Any] = {
                "model": model,
                "image": img_arg,
                "prompt": prompt,
                **extra,
            }
            if mask_path is not None:
                mf = mask_path.open("rb")
                opened.append(mf)
                kw["mask"] = mf
            result = client.images.edit(**kw)
        finally:
            for fh in opened:
                fh.close()
        blobs = _images_from_response(result)

    imgs = _persist_pngs(ctx, blobs)

    if not blobs:
        _LOG.warning("OpenAI returned no image bytes for node %s", ctx.node.id)

    primary = imgs[0] if imgs else None
    return {
        "prompt": prompt,
        "images": imgs,
        "image_path": primary,
        "model": model,
        "text": primary or "",
        "input_images_used": segments,
        "mask_image_used": mask_rendered or None,
    }

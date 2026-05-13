"""OpenAI Audio API — transcribe remote video URLs (GPT-4o transcribe family)."""

from __future__ import annotations

import hashlib
import logging
import os
from pathlib import Path

import requests

_LOG = logging.getLogger(__name__)

_CACHE_ROOT = Path.home() / ".avcm-cache" / "reel_transcripts"
_MAX_BYTES = 25 * 1024 * 1024
_DEFAULT_MODEL = "gpt-4o-transcribe"
_DEFAULT_UA = "Mozilla/5.0 (compatible; LaunchyVoice/1.0; +https://example.local)"

_SESSION = requests.Session()


def transcribe_model() -> str:
    return (os.getenv("OPENAI_TRANSCRIBE_MODEL") or _DEFAULT_MODEL).strip() or _DEFAULT_MODEL


def _cache_key(video_url: str, shortcode: str) -> str:
    h = hashlib.sha256(f"{shortcode}|{video_url}".encode()).hexdigest()[:24]
    return f"{shortcode}_{h}" if shortcode else h


def _cache_paths(key: str) -> tuple[Path, Path]:
    _CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    media = _CACHE_ROOT / f"{key}.mp4"
    txt = _CACHE_ROOT / f"{key}.txt"
    return media, txt


def transcribe_video_url_cached(
    video_url: str,
    shortcode: str,
    *,
    prompt: str | None = None,
) -> str:
    """
    Download video (cached), transcribe with gpt-4o-transcribe (or OPENAI_TRANSCRIBE_MODEL).
    Returns plain transcript text.
    """
    if not video_url or not str(video_url).strip().startswith("http"):
        return ""
    key = _cache_key(video_url.strip(), shortcode.strip() or "x")
    media, transcript_path = _cache_paths(key)

    if transcript_path.is_file():
        return transcript_path.read_text(encoding="utf-8").strip()

    if not media.is_file() or media.stat().st_size == 0:
        r = _SESSION.get(
            video_url.strip(),
            headers={"User-Agent": _DEFAULT_UA},
            timeout=180,
            stream=True,
        )
        r.raise_for_status()
        total = 0
        chunks: list[bytes] = []
        for chunk in r.iter_content(chunk_size=65536):
            if not chunk:
                continue
            total += len(chunk)
            if total > _MAX_BYTES:
                raise OSError("Video larger than 25 MB; cannot transcribe in one request.")
            chunks.append(chunk)
        media.write_bytes(b"".join(chunks))

    default_prompt = (
        "Transcribe all spoken words. Keep light disfluencies when present (um, uh, like). "
        "This is a short vertical social video monologue or voiceover."
    )
    pr = (prompt or "").strip() or default_prompt

    from openai import OpenAI

    client = OpenAI()
    model = transcribe_model()

    with open(media, "rb") as fh:
        tr = client.audio.transcriptions.create(
            model=model,
            file=fh,
            response_format="text",
            prompt=pr,
        )
    text = tr if isinstance(tr, str) else getattr(tr, "text", "") or ""
    text = str(text).strip()
    transcript_path.write_text(text, encoding="utf-8")
    return text

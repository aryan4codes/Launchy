"""Gemini workflow node persists PNGs — external API mocked."""

from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import MagicMock

import google.genai as genai_root
import pytest
from PIL import Image

from workflow.context import NodeExecContext
from workflow.nodes.gemini_image_node import run_gemini_image_node
from workflow.schema import GeminiImageParams, NodeSpec


@pytest.fixture(autouse=True)
def _fake_google_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_API_KEY", "test-google-key")


def test_gemini_image_writes_png(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color=(12, 200, 90)).save(buf, format="PNG")
    png_bytes = buf.getvalue()

    inline = MagicMock()
    inline.data = png_bytes

    part = MagicMock()
    part.inline_data = inline

    fake_candidate = MagicMock()
    fake_content = MagicMock()
    fake_content.parts = [part]
    fake_candidate.content = fake_content

    fake_response = MagicMock()
    fake_response.candidates = [fake_candidate]
    fake_response.parts = []

    fake_models = MagicMock()
    fake_models.generate_content.return_value = fake_response

    fake_cli = MagicMock()
    fake_cli.models = fake_models

    monkeypatch.setattr(genai_root, "Client", MagicMock(return_value=fake_cli))

    ctx = NodeExecContext(
        run_id="r1",
        workflow_inputs={"niche": "AI"},
        upstream_outputs={},
        completed_outputs={},
        node=NodeSpec(id="viz", type="media.gemini_image", params={}),
        outputs_base=tmp_path / "r1",
        memory_collection=None,
    )

    out = run_gemini_image_node(
        ctx,
        GeminiImageParams(prompt_template="{{ niche }} brand hero", model="gemini-2.5-flash-image"),
    )

    assert out["images"]
    assert (tmp_path / "r1" / "images" / "viz_0.png").is_file()
    assert out.get("image_path")

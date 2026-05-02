"""OpenAI workflow image node persists PNGs — external API mocked."""

from __future__ import annotations

import base64
import io
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from PIL import Image

from workflow.context import NodeExecContext
from workflow.nodes.openai_image_node import run_openai_image_node
from workflow.schema import NodeSpec, OpenAIImageParams


@pytest.fixture(autouse=True)
def _fake_openai_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")


def test_openai_image_generate_writes_png(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color=(12, 200, 90)).save(buf, format="PNG")
    png_bytes = buf.getvalue()
    b64 = base64.standard_b64encode(png_bytes).decode("ascii")

    fake_item = MagicMock()
    fake_item.b64_json = b64
    fake_item.url = None

    fake_result = MagicMock()
    fake_result.data = [fake_item]

    fake_images = MagicMock()
    fake_images.generate.return_value = fake_result

    fake_cli = MagicMock()
    fake_cli.images = fake_images

    monkeypatch.setattr("workflow.nodes.openai_image_node.OpenAI", MagicMock(return_value=fake_cli))

    ctx = NodeExecContext(
        run_id="r1",
        workflow_inputs={"niche": "AI"},
        upstream_outputs={},
        completed_outputs={},
        node=NodeSpec(id="viz", type="media.gemini_image", params={}),
        outputs_base=tmp_path / "r1",
        memory_collection=None,
    )

    out = run_openai_image_node(
        ctx,
        OpenAIImageParams(prompt_template="{{ niche }} brand hero", model="gpt-image-2"),
    )

    assert out["images"]
    assert (tmp_path / "r1" / "images" / "viz_0.png").is_file()
    assert out.get("image_path")
    fake_images.generate.assert_called_once()
    assert fake_images.edit.call_count == 0

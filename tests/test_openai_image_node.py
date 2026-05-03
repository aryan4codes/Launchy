"""Leonardo image node persists PNGs for both model families."""

from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from PIL import Image
from pydantic import ValidationError

from workflow.context import NodeExecContext
from workflow.nodes.openai_image_node import run_openai_image_node
from workflow.schema import NodeSpec, OpenAIImageParams


@pytest.fixture(autouse=True)
def _fake_openai_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LEONARDO_API_KEY", "test-leonardo-key")


def _mk_ctx(tmp_path: Path) -> NodeExecContext:
    return NodeExecContext(
        run_id="r1",
        workflow_inputs={"niche": "AI"},
        upstream_outputs={},
        completed_outputs={},
        node=NodeSpec(id="viz", type="media.gemini_image", params={}),
        outputs_base=tmp_path / "r1",
        memory_collection=None,
    )


def test_openai_image_generate_writes_png_flux(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color=(12, 200, 90)).save(buf, format="PNG")
    png_bytes = buf.getvalue()
    fake_submit = MagicMock()
    fake_submit.json.return_value = {"sdGenerationJob": {"generationId": "gen-1"}}
    fake_submit.raise_for_status.return_value = None

    fake_poll = MagicMock()
    fake_poll.json.return_value = {
        "generations_by_pk": {
            "status": "COMPLETE",
            "generated_images": [{"url": "https://example.com/img.png"}],
        }
    }
    fake_poll.raise_for_status.return_value = None

    fake_img = MagicMock()
    fake_img.content = png_bytes
    fake_img.raise_for_status.return_value = None

    post_mock = MagicMock(return_value=fake_submit)
    get_mock = MagicMock(side_effect=[fake_poll, fake_img])
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.post", post_mock)
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.get", get_mock)

    ctx = _mk_ctx(tmp_path)

    out = run_openai_image_node(
        ctx,
        OpenAIImageParams(prompt_template="{{ niche }} brand hero", image_model="flux_dev", num_images=1),
    )

    assert out["images"]
    assert (tmp_path / "r1" / "images" / "viz_0.png").is_file()
    assert out.get("image_path")
    assert out.get("provider") == "leonardo"
    assert out.get("image_model") == "flux_dev"
    post_mock.assert_called_once()
    assert get_mock.call_count == 2
    submit_url = post_mock.call_args.kwargs.get("url") or post_mock.call_args.args[0]
    submit_body = post_mock.call_args.kwargs.get("json")
    assert submit_url.endswith("/api/rest/v1/generations")
    assert isinstance(submit_body, dict)
    assert "styleUUID" not in submit_body
    assert "Keep any on-image text minimal" in submit_body["prompt"]


def test_openai_image_generate_writes_png_nano_banana_2(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color=(12, 200, 90)).save(buf, format="PNG")
    png_bytes = buf.getvalue()
    fake_submit = MagicMock()
    fake_submit.json.return_value = {"generation": {"id": "gen-nano-1"}}
    fake_submit.raise_for_status.return_value = None

    fake_poll = MagicMock()
    fake_poll.json.return_value = {
        "generations_by_pk": {
            "status": "COMPLETE",
            "generated_images": [{"url": "https://example.com/nano.png"}],
        },
    }
    fake_poll.raise_for_status.return_value = None

    fake_img = MagicMock()
    fake_img.content = png_bytes
    fake_img.raise_for_status.return_value = None

    post_mock = MagicMock(return_value=fake_submit)
    get_mock = MagicMock(side_effect=[fake_poll, fake_img])
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.post", post_mock)
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.get", get_mock)

    ctx = _mk_ctx(tmp_path)
    out = run_openai_image_node(
        ctx,
        OpenAIImageParams(
            prompt_template="{{ niche }} brand hero",
            image_model="nano_banana_2",
            num_images=1,
        ),
    )

    assert out["images"]
    assert (tmp_path / "r1" / "images" / "viz_0.png").is_file()
    assert out.get("provider") == "leonardo"
    assert out.get("image_model") == "nano_banana_2"
    assert out.get("model_id") == "nano-banana-2"
    post_mock.assert_called_once()
    submit_url = post_mock.call_args.kwargs.get("url") or post_mock.call_args.args[0]
    submit_body = post_mock.call_args.kwargs.get("json")
    assert submit_url.endswith("/api/rest/v2/generations")
    poll_url = get_mock.call_args_list[0].args[0]
    assert "/api/rest/v1/" in poll_url
    assert poll_url.endswith("/generations/gen-nano-1")
    assert isinstance(submit_body, dict)
    assert submit_body.get("model") == "nano-banana-2"
    assert isinstance(submit_body.get("parameters"), dict)
    params = submit_body["parameters"]
    assert params.get("quantity") == 1
    assert params.get("prompt_enhance") == "OFF"
    assert "Keep any on-image text minimal" in params.get("prompt", "")


def test_openai_image_nano_banana_enhance_on(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color=(40, 40, 200)).save(buf, format="PNG")
    png_bytes = buf.getvalue()
    fake_submit = MagicMock()
    fake_submit.json.return_value = {"generation": {"id": "gen-nano-2"}}
    fake_submit.raise_for_status.return_value = None
    fake_poll = MagicMock()
    fake_poll.json.return_value = {
        "generations_by_pk": {
            "status": "COMPLETE",
            "generated_images": [{"url": "https://example.com/nano-on.png"}],
        },
    }
    fake_poll.raise_for_status.return_value = None
    fake_img = MagicMock()
    fake_img.content = png_bytes
    fake_img.raise_for_status.return_value = None
    post_mock = MagicMock(return_value=fake_submit)
    get_mock = MagicMock(side_effect=[fake_poll, fake_img])
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.post", post_mock)
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.get", get_mock)
    ctx = _mk_ctx(tmp_path)
    run_openai_image_node(
        ctx,
        OpenAIImageParams(
            prompt_template="Bright hero",
            image_model="nano_banana_2",
            enhance_prompt=True,
        ),
    )
    submit_body = post_mock.call_args.kwargs["json"]
    assert submit_body["parameters"]["prompt_enhance"] == "ON"


def test_openai_image_params_rejects_bad_nano_pixel_sizes() -> None:
    with pytest.raises(ValidationError):
        OpenAIImageParams(
            prompt_template="{{ topic }} hero",
            image_model="nano_banana_2",
            width=900,
            height=1024,
        )


def test_openai_image_flux_ignores_nano_default_style_uuid(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color=(80, 100, 150)).save(buf, format="PNG")
    png_bytes = buf.getvalue()
    fake_submit = MagicMock()
    fake_submit.json.return_value = {"sdGenerationJob": {"generationId": "gen-flux-2"}}
    fake_submit.raise_for_status.return_value = None
    fake_poll = MagicMock()
    fake_poll.json.return_value = {
        "generations_by_pk": {
            "status": "COMPLETE",
            "generated_images": [{"url": "https://example.com/flux.png"}],
        }
    }
    fake_poll.raise_for_status.return_value = None
    fake_img = MagicMock()
    fake_img.content = png_bytes
    fake_img.raise_for_status.return_value = None
    post_mock = MagicMock(return_value=fake_submit)
    get_mock = MagicMock(side_effect=[fake_poll, fake_img])
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.post", post_mock)
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.get", get_mock)
    ctx = _mk_ctx(tmp_path)
    run_openai_image_node(
        ctx,
        OpenAIImageParams(
            prompt_template="hero",
            image_model="flux_dev",
            style_uuid="111dc692-d470-4eec-b791-3475abac4c46",
        ),
    )
    submit_body = post_mock.call_args.kwargs.get("json")
    assert isinstance(submit_body, dict)
    assert "styleUUID" not in submit_body


def test_openai_image_flux_trims_prompt_to_leonardo_limit(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color=(10, 10, 10)).save(buf, format="PNG")
    png_bytes = buf.getvalue()
    fake_submit = MagicMock()
    fake_submit.json.return_value = {"sdGenerationJob": {"generationId": "gen-flux-3"}}
    fake_submit.raise_for_status.return_value = None
    fake_poll = MagicMock()
    fake_poll.json.return_value = {
        "generations_by_pk": {
            "status": "COMPLETE",
            "generated_images": [{"url": "https://example.com/flux-trim.png"}],
        }
    }
    fake_poll.raise_for_status.return_value = None
    fake_img = MagicMock()
    fake_img.content = png_bytes
    fake_img.raise_for_status.return_value = None
    post_mock = MagicMock(return_value=fake_submit)
    get_mock = MagicMock(side_effect=[fake_poll, fake_img])
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.post", post_mock)
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.get", get_mock)
    ctx = _mk_ctx(tmp_path)
    long_prompt = "A" * 1700
    out = run_openai_image_node(
        ctx,
        OpenAIImageParams(prompt_template=long_prompt, image_model="flux_dev"),
    )
    submit_body = post_mock.call_args.kwargs.get("json")
    assert isinstance(submit_body, dict)
    assert len(submit_body["prompt"]) == 1500
    assert out["prompt"] == submit_body["prompt"]


def test_openai_image_params_accepts_empty_quality_legacy_value() -> None:
    p = OpenAIImageParams(
        prompt_template="{{ topic }} hero",
        image_model="flux_dev",
        quality="",
    )
    assert p.quality is None


def test_openai_image_submit_payload_list_extracts_generation_id(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color=(20, 30, 40)).save(buf, format="PNG")
    png_bytes = buf.getvalue()
    fake_submit = MagicMock()
    fake_submit.json.return_value = [{"generation": {"id": "gen-list-1"}}]
    fake_submit.raise_for_status.return_value = None
    fake_poll = MagicMock()
    fake_poll.json.return_value = {
        "generations_by_pk": {
            "status": "COMPLETE",
            "generated_images": [{"url": "https://example.com/list-id.png"}],
        }
    }
    fake_poll.raise_for_status.return_value = None
    fake_img = MagicMock()
    fake_img.content = png_bytes
    fake_img.raise_for_status.return_value = None
    post_mock = MagicMock(return_value=fake_submit)
    get_mock = MagicMock(side_effect=[fake_poll, fake_img])
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.post", post_mock)
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.get", get_mock)
    ctx = _mk_ctx(tmp_path)
    out = run_openai_image_node(
        ctx,
        OpenAIImageParams(prompt_template="list payload", image_model="nano_banana_2"),
    )
    assert out["images"]
    poll_url = get_mock.call_args_list[0].args[0]
    assert poll_url.endswith("/generations/gen-list-1")


def test_openai_image_prompt_guardrail_not_duplicated(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), color=(50, 80, 120)).save(buf, format="PNG")
    png_bytes = buf.getvalue()
    fake_submit = MagicMock()
    fake_submit.json.return_value = {"sdGenerationJob": {"generationId": "gen-guard-1"}}
    fake_submit.raise_for_status.return_value = None
    fake_poll = MagicMock()
    fake_poll.json.return_value = {
        "generations_by_pk": {
            "status": "COMPLETE",
            "generated_images": [{"url": "https://example.com/guard.png"}],
        }
    }
    fake_poll.raise_for_status.return_value = None
    fake_img = MagicMock()
    fake_img.content = png_bytes
    fake_img.raise_for_status.return_value = None
    post_mock = MagicMock(return_value=fake_submit)
    get_mock = MagicMock(side_effect=[fake_poll, fake_img])
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.post", post_mock)
    monkeypatch.setattr("workflow.nodes.openai_image_node.requests.get", get_mock)
    ctx = _mk_ctx(tmp_path)
    prompt = (
        "Create a coherent composition with strong visuals and no gibberish lettering. "
        "Keep text minimal."
    )
    run_openai_image_node(
        ctx,
        OpenAIImageParams(prompt_template=prompt, image_model="flux_dev"),
    )
    submit_body = post_mock.call_args.kwargs["json"]
    prompt_out = submit_body["prompt"]
    assert prompt_out.count("Keep any on-image text minimal") <= 1

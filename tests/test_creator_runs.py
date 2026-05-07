"""Creator-run API: template selection and input mapping."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from http_api.server import app


def test_creator_runs_uses_no_image_template_by_default() -> None:
    captured: dict = {}

    def fake_schedule(spec, inputs):  # type: ignore[no-untyped-def]
        captured["spec"] = spec
        captured["inputs"] = inputs
        return "test-run-id"

    with patch("http_api.routes.creator_runs.schedule_workflow_run", fake_schedule):
        client = TestClient(app)
        res = client.post(
            "/creator-runs",
            json={"topic": "AI education", "create_images": False},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["run_id"] == "test-run-id"
    assert body["workflow_id"]
    node_ids = {n.id for n in captured["spec"].nodes}
    assert "hero_images" not in node_ids
    assert "image_prompt" not in node_ids
    assert captured["inputs"]["topic"] == "AI education"
    assert captured["inputs"]["instagram_profile_consent"] is False


def test_creator_runs_with_images_includes_image_nodes() -> None:
    captured: dict = {}

    def fake_schedule(spec, inputs):  # type: ignore[no-untyped-def]
        captured["spec"] = spec
        return "run-2"

    with patch("http_api.routes.creator_runs.schedule_workflow_run", fake_schedule):
        client = TestClient(app)
        res = client.post(
            "/creator-runs",
            json={"topic": "Skincare", "create_images": True},
        )
    assert res.status_code == 200
    node_ids = {n.id for n in captured["spec"].nodes}
    assert "hero_images" in node_ids
    assert "image_prompt" in node_ids


def test_creator_runs_instagram_url_sets_consent() -> None:
    captured: dict = {}

    def fake_schedule(spec, inputs):  # type: ignore[no-untyped-def]
        captured["inputs"] = inputs
        return "run-3"

    with patch("http_api.routes.creator_runs.schedule_workflow_run", fake_schedule):
        client = TestClient(app)
        res = client.post(
            "/creator-runs",
            json={
                "topic": "Travel",
                "create_images": False,
                "instagram_url": "https://instagram.com/myhandle",
            },
        )
    assert res.status_code == 200
    assert captured["inputs"]["instagram_profile_consent"] is True
    assert captured["inputs"]["instagram_username"] == "myhandle"


def test_creator_runs_prior_context_merged_into_persona() -> None:
    captured: dict = {}

    def fake_schedule(spec, inputs):  # type: ignore[no-untyped-def]
        captured["inputs"] = inputs
        return "run-prior"

    with patch("http_api.routes.creator_runs.schedule_workflow_run", fake_schedule):
        client = TestClient(app)
        res = client.post(
            "/creator-runs",
            json={
                "topic": "X",
                "create_images": False,
                "prior_context": "Previously we focused on short tutorials.",
            },
        )
    assert res.status_code == 200
    cp = captured["inputs"]["creator_persona"]
    assert isinstance(cp, str)
    assert "saved Launchy memory" in cp
    assert "Previously we focused" in cp

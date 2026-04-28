"""Pytest fixtures and env defaults."""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def env_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-key")


@pytest.fixture(autouse=True)
def reset_chroma_cache() -> None:
    from memory.chroma_client import reset_client_cache

    reset_client_cache()
    yield
    reset_client_cache()

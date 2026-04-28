"""FastAPI dependencies."""

from __future__ import annotations

from functools import lru_cache

from core.pipeline import PipelineController, get_controller


@lru_cache
def controller_singleton() -> PipelineController:
    return get_controller()


def get_pipeline_controller() -> PipelineController:
    return controller_singleton()


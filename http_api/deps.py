"""FastAPI dependencies."""

from __future__ import annotations

from functools import lru_cache

from core.pipeline import PipelineController, get_controller
from workflow.engine import WorkflowEngine
from workflow.run_hub import WorkflowRunHub


@lru_cache
def controller_singleton() -> PipelineController:
    return get_controller()


def get_pipeline_controller() -> PipelineController:
    return controller_singleton()


@lru_cache
def workflow_hub_singleton() -> WorkflowRunHub:
    return WorkflowRunHub()


def get_workflow_hub() -> WorkflowRunHub:
    return workflow_hub_singleton()


def get_workflow_engine() -> WorkflowEngine:
    return WorkflowEngine(hub=workflow_hub_singleton())


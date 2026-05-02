"""Pydantic models for workflow specs, runs, and WebSocket events."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator


class NodeSpec(BaseModel):
    """A node instance in a workflow graph (React Flow `data` maps to ``params``)."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    id: str = Field(min_length=1)
    type: str = Field(min_length=1)
    params: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias=AliasChoices("params", "data"),
        serialization_alias="data",
    )
    position: dict[str, float] | None = None


class EdgeSpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    id: str | None = None
    source: str
    target: str
    sourceHandle: str | None = Field(default=None, validation_alias=AliasChoices("sourceHandle", "source_handle"))
    targetHandle: str | None = Field(default=None, validation_alias=AliasChoices("targetHandle", "target_handle"))


class WorkflowSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str | None = None
    name: str = Field(default="Workflow")
    nodes: list[NodeSpec]
    edges: list[EdgeSpec]

    @model_validator(mode="after")
    def _check_graph_ids(self) -> WorkflowSpec:
        ids = [n.id for n in self.nodes]
        if len(ids) != len(set(ids)):
            raise ValueError("Workflow node ids must be unique.")
        known = set(ids)
        for e in self.edges:
            if e.source not in known:
                raise ValueError(f"Edge source '{e.source}' references unknown node.")
            if e.target not in known:
                raise ValueError(f"Edge target '{e.target}' references unknown node.")
        return self


# --- Param models (JSON Schema for node-types) ---


class TriggerInputParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    keys: list[str] | None = None


class CrewAIParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = "Assistant"
    goal: str = "Complete the assigned task faithfully from context."
    backstory: str = "You use only supplied context."
    task_description_template: str = (
        "Upstreams (JSON):\n{{ upstream | pretty }}\n\nComplete the task using the above."
    )
    expected_output: str = "Concise textual output suitable for downstream nodes."


class RedditSourceParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subreddits_template: str = "{{ niche | default('AskReddit') }}"
    limit: Annotated[int, Field(ge=1, le=25)] = 15


class SerperSourceParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query_template: str = "{{ niche | default('trends') }}"


class ScrapeURLParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url_template: str


class MemoryQueryParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query_template: str
    top_k: Annotated[int, Field(ge=1, le=40)] | None = None


class MemoryWriteParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content_id_template: str | None = None
    topic_template: str
    hook_template: str
    platform_template: str = "twitter"
    angle_template: str = "general"
    predicted_score_template: str = "50"


class TransformTemplateParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template: str


class OutputPiecesParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    include_node_metadata: bool = True


class OpenAIImageParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt_template: str
    model: str | None = "gpt-image-2"
    """Pipe-separated image paths (Jinja). Empty → ``images.generate``; one or more → ``images.edit``."""

    input_images_template: str | None = None
    mask_image_path_template: str | None = None
    size: str | None = None
    quality: str | None = None


class RunStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class RunEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["run_started", "node_started", "node_finished", "node_failed", "run_finished"]
    run_id: str
    ts: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    node_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class WorkflowRunCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workflow_id: str | None = None
    workflow: WorkflowSpec | None = None
    inputs: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _need_workflow(self) -> WorkflowRunCreate:
        if self.workflow is None and not self.workflow_id:
            raise ValueError("Provide `workflow` inline or `workflow_id` to load from disk.")
        return self


class WorkflowRunState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    status: RunStatus
    workflow_snapshot: WorkflowSpec | None = None
    inputs: dict[str, Any] = Field(default_factory=dict)
    node_outputs: dict[str, dict[str, Any]] = Field(default_factory=dict)
    final_output: dict[str, Any] | None = None
    error: str | None = None


class WorkflowUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spec: WorkflowSpec

"""Workflow CRUD, node-type schemas, and template cloning."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from workflow.registry import get_node_type_schemas
from workflow.schema import WorkflowSpec

from http_api.workflow_storage import (
    clone_template,
    delete_workflow,
    list_stored_ids,
    list_template_ids,
    load_template,
    load_workflow,
    save_workflow,
)

router = APIRouter()


class WorkflowCreateBody(BaseModel):
    name: str = "Untitled workflow"
    nodes: list = Field(default_factory=list)
    edges: list = Field(default_factory=list)


class CloneTemplateBody(BaseModel):
    template_id: str
    name: str = "From template"


@router.get("/node-types")
def node_types() -> dict[str, dict]:
    return get_node_type_schemas()


@router.get("/templates")
def templates() -> dict[str, list[str]]:
    return {"templates": list_template_ids()}


@router.get("/templates/{template_id}")
def get_template(template_id: str) -> dict:
    try:
        spec = load_template(template_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="template not found")
    return spec.model_dump(mode="json", by_alias=True)


@router.post("/clone-template", response_model=WorkflowSpec)
def post_clone_template(body: CloneTemplateBody) -> WorkflowSpec:
    try:
        return clone_template(body.template_id, body.name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="template not found")


@router.get("")
def list_workflows() -> dict[str, list[str]]:
    return {"workflows": list_stored_ids()}


@router.post("", response_model=WorkflowSpec)
def create_workflow(body: WorkflowCreateBody) -> WorkflowSpec:
    spec = WorkflowSpec.model_validate(
        {
            "name": body.name,
            "nodes": body.nodes,
            "edges": body.edges,
        }
    )
    return save_workflow(spec)


@router.get("/{workflow_id}", response_model=WorkflowSpec)
def read_workflow(workflow_id: str) -> WorkflowSpec:
    try:
        return load_workflow(workflow_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="workflow not found")


@router.put("/{workflow_id}", response_model=WorkflowSpec)
def update_workflow(workflow_id: str, body: WorkflowSpec) -> WorkflowSpec:
    body = body.model_copy(update={"id": workflow_id}, deep=True)
    return save_workflow(body)


@router.delete("/{workflow_id}")
def remove_workflow(workflow_id: str) -> dict[str, str]:
    try:
        load_workflow(workflow_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="workflow not found")
    delete_workflow(workflow_id)
    return {"ok": "true"}

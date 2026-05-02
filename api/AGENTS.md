# `api/`

- Routes delegate to `PipelineController` — no CrewAI imports there.
- **`/workflows`** — CRUD on `WorkflowSpec` JSON (`api/workflow_storage.py`), templates under `workflows/templates/`.
- **`/workflow-runs`** — `POST` starts `WorkflowEngine.execute` via `asyncio.create_task`; poll **`GET /workflow-runs/{run_id}`** or stream **`WebSocket /workflow-runs/{run_id}/ws`** (tails `outputs/<run_id>/events.jsonl`).
- Static **`/app`** serves `web/dist` when present.
- Extend GET `/runs/{id}` when run history is persisted beyond filesystem JSON.

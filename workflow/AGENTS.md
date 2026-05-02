# `workflow/`

- **Purpose**: DAG workflow engine for the **Workflow Canvas** — composable nodes (sources, CrewAI agent steps, memory, transforms, Gemini image generation, aggregation) executed in topological order with filesystem artifacts under `outputs/<run_id>/`.
- **`workflow/schema.py`**: Public shapes — `WorkflowSpec`, `NodeSpec`, `EdgeSpec`, `RunEvent`, run API bodies. React Flow persists node payloads under the **`data`** alias (`params` in handlers).
- **`workflow/registry.py`** / **`node_handlers.py`**: Handler registry + JSON Schema export for `GET /workflows/node-types`.
- **`workflow/engine.py`**: Cycle detection, Kahn topo sort, async execution (`asyncio.to_thread` for blocking tools), **`workflow_run.json`**, **`nodes/`**, **`events.jsonl`**, optional `WorkflowRunHub` broadcasts.
- **`workflow/nodes/gemini_image_node.py`**: `google-genai` (`gemini-2.5-flash-image` default), Pillow PNG writes; **`GOOGLE_API_KEY`** in `.env`; image paths exposed as **`{run_id}/images/<node_id>_<n>.png`** for `/artifacts`.
- **`api/workflow_storage.py`**: Saved workflows → **`workflows/stored/`**; templates → **`workflows/templates/`**.
- **Imports**: Workflow code may import `agents`-adjacent tooling (`crewai_tools`, `tools.*`, Chroma). Keep **`core/`** free of these imports — orchestration crosses at `workflow` / `api` layers only.

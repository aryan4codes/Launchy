# `workflow/`

- **Purpose**: DAG workflow engine for the **Workflow Canvas** — composable nodes (sources, CrewAI agent steps, memory, transforms, Gemini image generation, aggregation) executed in topological order with filesystem artifacts under `outputs/<run_id>/`.
- **`workflow/schema.py`**: Public shapes — `WorkflowSpec`, `NodeSpec`, `EdgeSpec`, `RunEvent`, run API bodies. React Flow persists node payloads under the **`data`** alias (`params` in handlers).
- **`workflow/registry.py`** / **`node_handlers.py`**: Handler registry + JSON Schema export for `GET /workflows/node-types`.
- **`workflow/engine.py`**: Cycle detection, Kahn topo sort, async execution (`asyncio.to_thread` for blocking tools), **`workflow_run.json`**, **`nodes/`**, **`events.jsonl`**, optional `WorkflowRunHub` broadcasts.
- **`workflow/nodes/openai_image_node.py`**: OpenAI Image API — `images.generate` (default) or `images.edit` when `input_images_template` resolves to path(s); model default **`gpt-image-2`**; **`OPENAI_API_KEY`**; PNG paths as **`{run_id}/images/<node_id>_<n>.png`** for `/artifacts`. The **web studio** presents guided “image instructions” for node type **`media.gemini_image`**; model/size/disk paths belong in the inspector’s optional fold, not in user-facing raw JSON. Persisted workflows keep the same node-type id.
- **`api/workflow_storage.py`**: Saved workflows → **`workflows/stored/`**; templates → **`workflows/templates/`**.
- **Imports**: Workflow code may import `agents`-adjacent tooling (`crewai_tools`, `tools.*`, Chroma). Keep **`core/`** free of these imports — orchestration crosses at `workflow` / `api` layers only.
- **`voice.load`** node loads `voice/profiles/<profile_id>.json` — templates use **`{{ voice.voice_block }}`** (merged in `workflow/render.py`).

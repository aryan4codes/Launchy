# `agents/`

- YAML lives in `agents/config/` — agents and tasks drive `crew_adapter.py`.
- Default LLM string: **`gpt-4.1-nano`** (`agents.yaml` `model_default`), overridable via `OPENAI_MODEL`.
- Trend Hunter tools are assembled from `tool_sets`; Instagram keys append only when `RunConfig.include_instagram`.

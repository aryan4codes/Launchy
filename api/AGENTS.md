# `api/`

- Routes delegate to `PipelineController` — no CrewAI imports here.
- Extend GET `/runs/{id}` when run history is persisted beyond filesystem JSON.

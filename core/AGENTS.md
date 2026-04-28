# `core/`

- No imports from `crewai`, `agents`, or `tools`. Apify must not appear here.
- Public contracts live in `config.py` (`RunConfig`, `RunResult`, `ContentPiece`).
- `pipeline.py` orchestrates via `PipelineRunner` protocol only.

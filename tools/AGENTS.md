# `tools/`

- Default **social** signals for Trend Hunter: **Reddit** (`reddit_tool.py`). Serper + scrape + landing page are non-social intent/competitor signals.
- **Instagram** (`instagram_apify_tool.py`) is a stub until Apify actor wiring; enable with `--instagram` / `RunConfig.include_instagram`. When implementing Scrapers:
  - Use **Apify MCP** (`user-apify`) in Cursor: `search-actors` → `fetch-actor-details` for the actor input schema.
  - Runtime uses `apify-client` + `APIFY_API_TOKEN` only when Instagram is enabled.
- Memory tools must match `memory/schema.py` metadata keys.
- **`twin_tools.py`**: Digital Twin tool implementations (memory query, Reddit/Serper, `start_workflow_run`, `draft_post`, etc.) used by `agents/twin_agent.py`.

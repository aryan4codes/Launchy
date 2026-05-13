# `twin/`

- **Sessions**: `outputs/twin_sessions/<id>.json` (meta) + `<id>.jsonl` (messages). See `session.py`.
- **Chat**: `http_api/routes/twin.py` streams SSE; tool loop in `agents/twin_agent.py`.
- **Tools**: `tools/twin_tools.py` — memory, research, voice, workflow templates, quick drafts.

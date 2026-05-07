# AVCM — Agent / contributor notes

## Stack

- Python **3.11**, **`uv`** package manager (`uv sync`, `uv run`). Avoid raw `pip install` in docs unless debugging.
- Load secrets from **`.env`** (see `.env.example`) — never commit keys.
- LLM default: **`gpt-4.1-nano`** (`OPENAI_MODEL`).
- Social signal ingestion defaults to **Reddit**; Instagram is behind `--instagram` / `RunConfig.include_instagram` (stub until Apify wiring).

## Architecture

- **`core/`** holds `RunConfig` / `RunResult` and `PipelineController`. No CrewAI imports there.
- **`agents/`** wires CrewAI via `crew_adapter.py` + YAML.
- **`tools/`** CrewAI tools + Chroma helpers.
- **`cli/`** and **`api/`** are thin shims over `PipelineController` plus workflow HTTP routes.
- **`workflow/`** — DAG specs, node handlers, and `WorkflowEngine`. **Product stance**: prioritize non-technical creators — guided inspector fields, minimal jargon in copy, collapsible tuning (see `workflow/AGENTS.md` and web inspector).

## Web app & marketing (`web/`)

- **Vite + React** SPA: **`/`** — [`web/src/pages/LandingPage.tsx`](web/src/pages/LandingPage.tsx); **`/campaigns`** — creator run start + progress ([`CampaignLandingPage.tsx`](web/src/pages/CampaignLandingPage.tsx), [`CampaignPage.tsx`](web/src/pages/CampaignPage.tsx)); **`/studio`** — Workflow Studio canvas.
- **Product language on marketing surfaces**: use **Digital Twin** for the creator journey (hero CTAs, section headers); backend and docs may still refer to **`avcm`**, **`RunConfig`**, and pipeline terminology.
- **README screenshot** for the hero: [`outputs/landing.png`](outputs/landing.png) (other product captures under [`outputs/`](outputs/)).

## External MCP servers (Cursor)

- **`user-apify`**: design-time only when authoring **`tools/instagram_apify_tool.py`**. Use MCP `search-actors` / `fetch-actor-details` for actor schemas before changing Apify inputs.
- **`cursor-ide-browser`**: manual verification of FastAPI / future web UI.
- **`plugin-supabase-supabase`**: reserved for future auth/storage — ignore unless building Supabase-backed features.

## Commands

```bash
uv sync
uv run pytest
uv run avcm run --niche "AI SaaS"
uv run avcm serve --port 8000
```

Subfolder **`AGENTS.md`** files add one rule each — read them when touching that tree.

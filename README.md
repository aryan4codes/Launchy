# AVCM — Autonomous Viral Content Machine

AVCM is a unified platform for end-to-end viral content generation, orchestrating a network of six specialized **CrewAI** agents that collaborate to ideate, draft, refine, and select high-performing content pieces. At its core is the **PipelineController**, a stateless orchestrator that exposes the full content lifecycle via both a modern **CLI** and a fast, RESTful **FastAPI** server — ensuring the same codepaths and configuration whether you're running interactively or deploying as an API service.

The system leverages **ChromaDB** vector memory (powered by OpenAI's `text-embedding-3-small` model) for long-term tracking of content performance and feedback loops. All generations and analytics are grounded in social "signals" by default: signals are sourced primarily from **Reddit** (for trend mining and angle discovery), while **Instagram** support is architected but intentionally limited — unlocked for future use with `--instagram` and powered via Apify scraping, currently stubbed and opt-in for privacy and reliability reasons.

AVCM is designed for rapid experimentation, extensibility, and production readiness. Whether you want to automate content creation for a fast-moving startup, run experiments on different social platforms, or pipe results into your analytics stack, AVCM provides the infrastructure, agent logic, and programmatic API endpoints to handle the full pipeline. Key features include highly configurable run settings, csv-based memory ingest for closed-loop learning, and support for multiple output platforms and social channels.

## Prerequisites

- Python **3.11**
- [`uv`](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh` or package manager)
- API keys in `.env` (copy from `.env.example`):
  - **`OPENAI_API_KEY`** — agents + `text-embedding-3-small` embeddings for Chroma
  - **`SERPER_API_KEY`** — Trend Hunter Google search (`SerperDevTool`)

Optional:

- **`CHROMA_PERSIST_DIR`** — overrides `./memory/performance_db`
- **`APIFY_API_TOKEN`** + `uv sync --extra instagram` — reserved for future Instagram actor wiring

## Setup

```bash
uv sync
cp .env.example .env   # fill keys
```

## CLI

Relevance is driven by your **`--niche` text** plus Serper searches templated from it (see `agents/crew_adapter.py` `_serper_query_hints`). Default Reddit subs are **niche-agnostic** broad discovery; pass **`--subreddits a,b,c`** when you want community-specific sourcing — there is **no** vertical keyword routing in code.

```bash
# Pipeline run (writes outputs/<run_id>.json)
uv run avcm run --niche "AI SaaS"

# Options shown — defaults match RunConfig (5 angles, 2 variations, twitter+linkedin)
uv run avcm run --niche "AI SaaS" --subreddits "SaaS,Entrepreneur" --platforms "twitter,linkedin"

# Instagram stub tool adds narrative hint only (no Apify scrape yet)
uv run avcm run --niche "fitness" --instagram

# Post-publish metrics → delta updates in Chroma (CSV columns: content_id,likes,shares,comments)
uv run avcm memory ingest path/to/results.csv

# FastAPI (same controller as CLI)
uv run avcm serve --port 8000
```

## HTTP API

- **`POST /runs/`** — JSON body matches **`RunConfig`** (`niche`, optional `platforms`, `angles`, `variations`, `include_instagram`, …)
- **`GET /runs/{run_id}`** — read **`outputs/{run_id}.json`** produced by the CLI/controller (filesystem-backed placeholder persistence)
- **`GET /runs/{run_id}/pieces`** — JSON array of content pieces only
- **`POST /memory/ingest`** — multipart CSV upload (same columns as CLI ingest)
- **`GET /health`**

Example:

```bash
curl -s -X POST http://127.0.0.1:8000/runs/ \
  -H "Content-Type: application/json" \
  -d '{"niche":"AI SaaS"}' | jq .
```

## Success metrics & telemetry hooks

- **Structured logs**: JSON lines on **`stderr`** from logger **`avcm`** (`core/logging.py`) with `"run_started"` / `"run_finished"` payloads (`run_id`, `success`, `pieces`).
- **Artifacts**: Each successful run writes **`outputs/<run_id>.json`** for downstream scoring or dashboards (`PipelineController`).
- **Calibration CSV**: Feed **`memory ingest`** after collecting likes/shares/comments so **`delta`** is recomputed vs **`predicted_score`** stored in Chroma metadata.

## Tests & lint

```bash
uv run pytest
uv run ruff check core agents tools memory api cli tests evals
```

## Governance

See **[AGENTS.md](AGENTS.md)** for MCP servers (**Apify** for Instagram authoring), Reddit-first defaults, and layer boundaries. Cursor rules live in **`.cursor/rules/`**.

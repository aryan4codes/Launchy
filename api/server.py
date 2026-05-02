"""FastAPI ASGI app."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import memory as memory_routes
from api.routes import runs as runs_routes
from api.routes import workflow_runs as wf_runs_routes
from api.routes import workflows as workflows_routes

load_dotenv()

app = FastAPI(title="AVCM API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(runs_routes.router, prefix="/runs", tags=["runs"])
app.include_router(memory_routes.router, prefix="/memory", tags=["memory"])
app.include_router(workflows_routes.router, prefix="/workflows", tags=["workflows"])
app.include_router(wf_runs_routes.router, prefix="/workflow-runs", tags=["workflow-runs"])
_outputs_root = Path("outputs")
_outputs_root.mkdir(parents=True, exist_ok=True)
app.mount("/artifacts", StaticFiles(directory=str(_outputs_root)), name="run_artifacts")

_web_dist = Path(__file__).resolve().parent.parent / "web" / "dist"
if _web_dist.is_dir():
    app.mount("/app", StaticFiles(directory=str(_web_dist), html=True), name="workflow_canvas")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

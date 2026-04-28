"""FastAPI ASGI app."""

from __future__ import annotations

from dotenv import load_dotenv
from fastapi import FastAPI

from api.routes import memory as memory_routes
from api.routes import runs as runs_routes

load_dotenv()

app = FastAPI(title="AVCM API", version="0.1.0")

app.include_router(runs_routes.router, prefix="/runs", tags=["runs"])
app.include_router(memory_routes.router, prefix="/memory", tags=["memory"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

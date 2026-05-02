"""Memory ingest endpoints."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, UploadFile

router = APIRouter()


@router.post("/ingest")
async def ingest_csv_upload(file: UploadFile = File(...)) -> dict:
    """Upload CSV with columns content_id, likes, shares, comments."""
    from tempfile import NamedTemporaryFile

    from memory.update import ingest_csv

    suffix = Path(file.filename or "data.csv").suffix or ".csv"
    data = await file.read()
    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        tmp.flush()
        path = Path(tmp.name)
    try:
        rows = ingest_csv(path)
    finally:
        path.unlink(missing_ok=True)
    return {"updated": len(rows), "rows": rows}


@router.get("/stats")
def memory_stats_stub() -> dict[str, str]:
    """Placeholder for collection analytics."""
    return {"detail": "Use chromadb CLI or extend memory/chroma_client for counts"}

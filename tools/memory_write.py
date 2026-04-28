"""Write scored content entries into ChromaDB."""

from __future__ import annotations

from datetime import datetime, timezone

from chromadb.api.models.Collection import Collection
from crewai.tools import tool


def build_memory_write_tool(collection: Collection, run_id_holder: dict[str, str]):
    @tool("memory_write_entry")
    def memory_write_entry(
        content_id: str,
        topic: str,
        hook: str,
        platform: str,
        angle: str,
        predicted_score: int,
    ) -> str:
        """
        Persist one scored content piece into vector memory for future similarity search.
        Call once per final content piece after scoring.
        """
        rid = run_id_holder.get("run_id", "unknown")
        created = datetime.now(timezone.utc).isoformat()
        doc = f"{topic}\n{hook}"
        metadata = {
            "content_id": content_id,
            "topic": topic[:512],
            "hook": hook[:512],
            "platform": platform,
            "angle": angle[:512],
            "predicted_score": int(predicted_score),
            "run_id": rid,
            "created_at": created,
        }
        collection.add(ids=[content_id], documents=[doc], metadatas=[metadata])
        return f"Stored memory for content_id={content_id}"

    return memory_write_entry


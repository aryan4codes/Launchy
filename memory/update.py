"""CSV ingest: update actual engagement metrics and compute delta."""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path

from memory.chroma_client import get_performance_collection
from tools.scorer_rubric import engagement_index


def engagement_delta(predicted_score: int, likes: int, shares: int, comments: int) -> float:
    actual = engagement_index(likes, shares, comments)
    return float(actual - predicted_score)


def update_row_from_csv_line(
    content_id: str,
    likes: int,
    shares: int,
    comments: int,
) -> dict[str, float | int | str]:
    coll = get_performance_collection()
    existing = coll.get(ids=[content_id], include=["metadatas"])
    if not existing["ids"]:
        raise KeyError(f"No memory entry for content_id={content_id}")
    meta = existing["metadatas"][0] or {}
    predicted = int(meta.get("predicted_score", 0))
    delta = engagement_delta(predicted, likes, shares, comments)
    meta["actual_likes"] = likes
    meta["actual_shares"] = shares
    meta["actual_comments"] = comments
    meta["delta"] = delta
    meta["updated_at"] = datetime.now(timezone.utc).isoformat()
    doc = coll.get(ids=[content_id], include=["documents"])["documents"][0]
    coll.update(ids=[content_id], metadatas=[meta], documents=[doc])
    return {"content_id": content_id, "predicted_score": predicted, "delta": delta}


def ingest_csv(path: Path) -> list[dict[str, float | int | str]]:
    rows: list[dict[str, float | int | str]] = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        required = {"content_id", "likes", "shares", "comments"}
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            raise ValueError(f"CSV must have columns: {required}")
        for row in reader:
            cid = row["content_id"].strip()
            rows.append(
                update_row_from_csv_line(
                    cid,
                    int(row["likes"]),
                    int(row["shares"]),
                    int(row["comments"]),
                )
            )
    return rows


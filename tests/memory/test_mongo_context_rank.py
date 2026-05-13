"""Tests for MongoDB creator-context helpers (no live DB required)."""

from memory.mongo_context import rank_chunks


def test_rank_chunks_prefers_keyword_overlap():
    chunks = [
        {"kind": "a", "text": "Building AI tools for creators"},
        {"kind": "b", "text": "Holiday baking tips"},
        {"kind": "c", "text": "AI agents and workflows explained"},
    ]
    top = rank_chunks(chunks, "AI creators", limit=2)
    kinds = [c["kind"] for c in top]
    assert "a" in kinds
    assert "c" in kinds

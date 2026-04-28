"""Semantic query against ChromaDB memory for similar past content."""

from __future__ import annotations

from chromadb.api.models.Collection import Collection
from crewai.tools import tool


def build_memory_query_tool(collection: Collection, default_k: int):
    @tool("memory_query_similar")
    def memory_query_similar(topic_and_hook: str) -> str:
        """
        Find semantically similar past content pieces by topic + hook text.
        Pass a short string combining niche topic and opening hook.
        """
        k = min(max(default_k, 1), 20)
        res = collection.query(query_texts=[topic_and_hook], n_results=k)
        lines: list[str] = []
        ids = res.get("ids", [[]])[0]
        docs = res.get("documents", [[]])[0]
        metas = res.get("metadatas", [[]])[0]
        dist = res.get("distances", [[]])[0] if res.get("distances") else []
        for i, cid in enumerate(ids):
            meta = metas[i] if i < len(metas) else {}
            doc = docs[i] if i < len(docs) else ""
            sim = ""
            if i < len(dist) and dist[i] is not None:
                sim = f" distance={dist[i]:.4f}"
            delta = meta.get("delta", "") if meta else ""
            pred = meta.get("predicted_score", "") if meta else ""
            lines.append(
                f"- id={cid}{sim} predicted={pred} delta={delta}\n  excerpt: {doc[:320]}..."
            )
        if not lines:
            return "No similar entries in memory yet."
        return "Similar memory entries:\n" + "\n".join(lines)

    return memory_query_similar


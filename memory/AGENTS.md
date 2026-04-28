# `memory/`

- Embedding model: `text-embedding-3-small` via ChromaDB OpenAI embedding function (`chroma_client.py`).
- Metadata fields must stay aligned with `memory/schema.py` when adding columns.
- CSV ingest: `content_id`, `likes`, `shares`, `comments` — see `update.py`.

"""ChromaDB client and collection bootstrap."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection
from chromadb.utils import embedding_functions


COLLECTION_NAME = "content_performance"
DEFAULT_PERSIST = Path("memory") / "performance_db"


def persist_dir() -> str:
    raw = os.environ.get("CHROMA_PERSIST_DIR")
    if raw:
        return str(Path(raw).resolve())
    return str((Path(__file__).resolve().parent.parent / DEFAULT_PERSIST).resolve())


@lru_cache
def get_client() -> ClientAPI:
    path = persist_dir()
    Path(path).mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=path)


def embedding_function():
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is required for ChromaDB embeddings")
    return embedding_functions.OpenAIEmbeddingFunction(
        api_key=key,
        model_name="text-embedding-3-small",
    )


def get_performance_collection() -> Collection:
    client = get_client()
    ef = embedding_function()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
        metadata={"description": "AVCM content performance memory"},
    )


def reset_client_cache() -> None:
    get_client.cache_clear()

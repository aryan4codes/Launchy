"""In-process pub/sub for workflow run WebSocket subscribers."""

from __future__ import annotations

import asyncio
from collections import defaultdict

from workflow.schema import RunEvent


class WorkflowRunHub:
    """Broadcasts typed events per ``run_id`` to registered asyncio queues."""

    def __init__(self) -> None:
        self._subs: dict[str, set[asyncio.Queue[RunEvent]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, run_id: str) -> asyncio.Queue[RunEvent]:
        q: asyncio.Queue[RunEvent] = asyncio.Queue()
        async with self._lock:
            self._subs[run_id].add(q)
        return q

    async def unsubscribe(self, run_id: str, q: asyncio.Queue[RunEvent]) -> None:
        async with self._lock:
            self._subs[run_id].discard(q)

    async def emit(self, run_id: str, event: RunEvent) -> None:
        async with self._lock:
            queues = list(self._subs.get(run_id, ()))
        for queue in queues:
            await queue.put(event)

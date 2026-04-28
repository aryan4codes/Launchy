"""Structured logging helpers for pipeline runs."""

from __future__ import annotations

import json
import logging
import sys
from typing import Any

_LOG = logging.getLogger("avcm")


def configure_logging(level: int = logging.INFO) -> None:
    if not logging.root.handlers:
        logging.basicConfig(
            level=level,
            format="%(asctime)s %(levelname)s %(name)s %(message)s",
            stream=sys.stderr,
        )


def log_event(event: str, **fields: Any) -> None:
    payload = {"event": event, **fields}
    _LOG.info(json.dumps(payload, default=str))


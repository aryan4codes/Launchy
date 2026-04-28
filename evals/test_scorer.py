"""Offline heuristic: stronger hooks (tier A) rank above weak hooks (tier C)."""

from __future__ import annotations

import json
from pathlib import Path

from tools.scorer_rubric import DIMENSION_WEIGHTS


def _hook_score(text: str) -> float:
    """Deterministic proxy for scroll-stop + specificity (eval-only)."""
    words = len(text.split())
    punch = text.count("—") + text.count("?") + text.count("!")
    return float(words * 2 + punch * 5)


def test_dimension_weights_sum_to_one() -> None:
    assert abs(sum(DIMENSION_WEIGHTS.values()) - 1.0) < 1e-9


def test_fixture_tier_a_hooks_outscore_tier_c() -> None:
    root = Path(__file__).resolve().parent / "fixtures" / "known_hooks.json"
    rows = json.loads(root.read_text(encoding="utf-8"))
    by_tier: dict[str, list[float]] = {"A": [], "B": [], "C": []}
    for row in rows:
        by_tier[row["tier"]].append(_hook_score(row["hook"]))
    mean_a = sum(by_tier["A"]) / len(by_tier["A"])
    mean_c = sum(by_tier["C"]) / len(by_tier["C"])
    assert mean_a > mean_c

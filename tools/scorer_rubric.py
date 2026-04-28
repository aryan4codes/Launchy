"""Scoring rubric weights (PRD §10) + engagement index for delta calibration."""

from __future__ import annotations

# Dimension -> weight (must sum to 1.0)
DIMENSION_WEIGHTS: dict[str, float] = {
    "scroll_stop": 0.30,
    "emotional_resonance": 0.25,
    "platform_fit": 0.20,
    "clarity": 0.15,
    "originality": 0.10,
}


def engagement_index(likes: int, shares: int, comments: int) -> float:
    """Heuristic index comparable across platforms (tunable)."""
    return float(likes + 5 * shares + 2 * comments)


def rubric_prompt_block() -> str:
    lines = [
        "Score each piece 0-100 using these dimensions and weights:",
        *[f"- {k}: {int(v * 100)}%" for k, v in DIMENSION_WEIGHTS.items()],
        "Final score = weighted sum. Cap memory-retrieval influence at up to 20% adjustment.",
    ]
    return "\n".join(lines)

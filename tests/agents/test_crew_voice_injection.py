"""Voice block placeholders reach formatted task YAML."""

from __future__ import annotations

from pathlib import Path

import yaml


def test_tasks_include_voice_placeholder() -> None:
    cfg_dir = Path(__file__).resolve().parents[2] / "agents" / "config"
    tasks = yaml.safe_load((cfg_dir / "tasks.yaml").read_text(encoding="utf-8"))
    angles = next(t for t in tasks["tasks"] if t["id"] == "angles")
    ctx = {
        "niche": "X",
        "platforms": "twitter",
        "angles": 3,
        "voice_block": "CUSTOM_VOICE_BLOCK",
        "variations": 1,
        "run_id": "rid",
        "top_k_memory": 3,
        "rubric_block": "rubric",
    }
    text = angles["description"].format(**ctx)
    assert "CUSTOM_VOICE_BLOCK" in text
    write_copy = next(t for t in tasks["tasks"] if t["id"] == "write_copy")
    assert "CUSTOM_VOICE_BLOCK" in write_copy["description"].format(**ctx)

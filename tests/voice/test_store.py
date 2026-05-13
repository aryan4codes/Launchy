"""Round-trip VoiceProfile persistence."""

from __future__ import annotations

from pathlib import Path

import pytest

from voice.schema import VoiceProfilerLLMOutput
from voice import store


def test_save_load_profile_roundtrip(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    import voice.store as vst

    def _dir() -> Path:
        p = tmp_path / "profiles"
        p.mkdir(parents=True, exist_ok=True)
        return p

    monkeypatch.setattr(vst, "profiles_dir", _dir)

    draft = VoiceProfilerLLMOutput(
        creator_name="Ada",
        tone_descriptors=["punchy"],
        vocabulary_signature=["ship"],
        sentence_style="Short lines.",
        do_list=["Use first person"],
        dont_list=["No jargon"],
        example_hooks=["Here is the lesson."],
        summary_block="VOICE PROFILE — Ada\nTone: punchy.",
    )
    p = store.build_voice_profile(draft, sample_count=3)
    store.save_profile(p)
    loaded = store.load_profile(p.profile_id)
    assert loaded.summary_block.startswith("VOICE PROFILE")
    assert loaded.tone_descriptors == ["punchy"]
    lst = store.list_profiles()
    assert len(lst) == 1

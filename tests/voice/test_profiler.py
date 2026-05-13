"""Voice profiler structured output."""

from __future__ import annotations

from voice.schema import VoiceProfilerLLMOutput


def test_voice_profiler_llm_output_validates_minimum() -> None:
    draft = VoiceProfilerLLMOutput(
        creator_name="Test",
        tone_descriptors=["direct"],
        vocabulary_signature=[],
        sentence_style="Mostly medium sentences.",
        do_list=["Be specific"],
        dont_list=["No hype"],
        example_hooks=["Start here.", "Then this.", "Finally."],
        summary_block="VOICE PROFILE — Test\nTone: direct.",
    )
    assert draft.example_hooks


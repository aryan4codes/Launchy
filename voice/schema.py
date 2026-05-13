"""Voice profile schemas — persisted + LLM profiler output."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ReelTranscription(BaseModel):
    """One transcribed reel collected during Instagram profiling."""

    reel_index: int
    shortcode: str
    url: str = ""
    caption: str = ""
    transcript: str = ""


class VoiceProfilerLLMOutput(BaseModel):
    """Structured output from the profiler agent (no IDs or timestamps)."""

    creator_name: str = Field(description="Creator display name aligned with samples.")
    tone_descriptors: list[str] = Field(
        description="Short adjectives/phrases capturing tone.",
        min_length=1,
        max_length=12,
    )
    vocabulary_signature: list[str] = Field(
        description="Distinct words or phrases the creator repeats.",
        min_length=0,
        max_length=20,
    )
    sentence_style: str = Field(
        description="One short paragraph on sentence length and structure patterns.",
    )
    do_list: list[str] = Field(description="Concrete style DO rules.", min_length=1)
    dont_list: list[str] = Field(description="Concrete style DON'T rules.", min_length=1)
    example_hooks: list[str] = Field(
        description="3-5 real opening lines / hooks derived from the samples.",
        min_length=1,
        max_length=8,
    )
    delivery_style: str = Field(
        default="",
        description=(
            "If SPOKEN_TRANSCRIPT lines exist: how they sound on camera (pace, energy, "
            "fillers, sentence rhythm). Empty string if no usable spoken audio in samples."
        ),
    )
    summary_block: str = Field(
        description=(
            "Ready-to-inject prompt block: VOICE PROFILE — Name, Tone, Vocabulary, "
            "Sentence style, spoken delivery (if any), DO, DON'T, Example hooks — compact."
        ),
    )


class VoiceProfile(VoiceProfilerLLMOutput):
    """Full stored profile with metadata."""

    profile_id: str
    created_at: str
    updated_at: str
    sample_count: int = Field(ge=0)
    transcriptions: list[ReelTranscription] = Field(default_factory=list)

    def model_dump_for_json(self) -> dict:
        return self.model_dump(mode="json")

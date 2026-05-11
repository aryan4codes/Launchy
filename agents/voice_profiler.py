"""CrewAI profiler: samples -> VoiceProfilerLLMOutput."""

from __future__ import annotations

import os

from crewai import Agent, Crew, Process, Task

from voice.schema import VoiceProfilerLLMOutput


def run_voice_profiler(*, creator_name: str, sample_texts: list[str]) -> VoiceProfilerLLMOutput:
    """Single-agent extraction of voice characteristics from raw sample strings."""
    os.environ.setdefault("OPENAI_MODEL", "gpt-4.1-nano")
    model = os.environ.get("OPENAI_MODEL", "gpt-4.1-nano")

    joined = "\n\n---SAMPLE_BREAK---\n\n".join(sample_texts) if sample_texts else "(no samples)"
    desc = f"""Creator name supplied by user: {creator_name}

Training samples (may include posts, scraped pages, or Reddit submissions separated by SAMPLE_BREAK):

{joined}

Infer this creator's PUBLIC writing voice for short-form marketing/social content.
Use ONLY patterns evident in the samples — do not invent biographical facts.
If samples are sparse, still produce best-effausible style guidance and mark uncertainty in sentence_style briefly.
Produce example_hooks using paraphrases or short quotes clearly derived from samples (do not invent brands/metrics absent from text).
"""

    agent = Agent(
        role="Voice profiler",
        goal="Produce a reusable voice style guide suitable for injecting into downstream copy agents.",
        backstory=(
            "You compress author style into DO/DON'T rules, tone adjectives, and a summary_block fragment "
            "that copywriters can paste into their prompts."
        ),
        tools=[],
        llm=model,
        verbose=False,
    )

    task = Task(
        description=desc,
        expected_output=(
            "Structured VoiceProfilerLLMOutput — every field populated; summary_block compact and imperative."
        ),
        agent=agent,
        output_pydantic=VoiceProfilerLLMOutput,
    )
    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    result = crew.kickoff(inputs={})
    jd = getattr(result, "json_dict", None)
    if jd:
        parsed = VoiceProfilerLLMOutput.model_validate(jd)
        if creator_name.strip():
            parsed = parsed.model_copy(update={"creator_name": creator_name.strip()})
        return parsed
    pyd = getattr(result, "pydantic", None)
    if pyd is not None:
        data = pyd.model_dump() if hasattr(pyd, "model_dump") else pyd
        parsed = VoiceProfilerLLMOutput.model_validate(data)
        if creator_name.strip():
            parsed = parsed.model_copy(update={"creator_name": creator_name.strip()})
        return parsed
    raise ValueError(f"Voice profiler produced no structured output: {getattr(result, 'raw', result)!r}")

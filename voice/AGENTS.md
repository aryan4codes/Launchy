# `voice/`

- **Profiles**: JSON files under `voice/profiles/<profile_id>.json` (`VoiceProfile` in `schema.py`).
- **Profiler**: `agents/voice_profiler.py` produces `VoiceProfilerLLMOutput`; `store.build_voice_profile` adds ids and timestamps.
- **Samples**: `sources.py` — text, optional URL scrape, optional Reddit username submissions.

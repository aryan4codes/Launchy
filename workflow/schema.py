"""Pydantic models for workflow specs, runs, and WebSocket events."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Any, Literal, Self

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator, model_validator


class NodeSpec(BaseModel):
    """A node instance in a workflow graph (React Flow `data` maps to ``params``)."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    id: str = Field(min_length=1)
    type: str = Field(min_length=1)
    params: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias=AliasChoices("params", "data"),
        serialization_alias="data",
    )
    position: dict[str, float] | None = None


class EdgeSpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    id: str | None = None
    source: str
    target: str
    sourceHandle: str | None = Field(default=None, validation_alias=AliasChoices("sourceHandle", "source_handle"))
    targetHandle: str | None = Field(default=None, validation_alias=AliasChoices("targetHandle", "target_handle"))


class WorkflowSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str | None = None
    name: str = Field(default="Workflow")
    nodes: list[NodeSpec]
    edges: list[EdgeSpec]

    @model_validator(mode="after")
    def _check_graph_ids(self) -> WorkflowSpec:
        ids = [n.id for n in self.nodes]
        if len(ids) != len(set(ids)):
            raise ValueError("Workflow node ids must be unique.")
        known = set(ids)
        for e in self.edges:
            if e.source not in known:
                raise ValueError(f"Edge source '{e.source}' references unknown node.")
            if e.target not in known:
                raise ValueError(f"Edge target '{e.target}' references unknown node.")
        return self


# --- Param models (JSON Schema for node-types) ---


class TriggerInputParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    keys: list[str] | None = None
    default_topic: str | None = None


class CrewAIParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = "Assistant"
    goal: str = "Complete the assigned task faithfully from context."
    backstory: str = "You use only supplied context."
    task_description_template: str = (
        "Upstreams (JSON):\n{{ upstream | pretty }}\n\nComplete the task using the above."
    )
    expected_output: str = "Concise textual output suitable for downstream nodes."


class RedditSourceParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subreddits_template: str = "{{ niche | default('AskReddit') }}"
    limit: Annotated[int, Field(ge=1, le=25)] = 15


class InstagramSourceParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scraping_mode: Literal["hashtags", "creator_profiles"] = Field(
        default="hashtags",
        description=(
            "hashtags: Apify hashtag search from hashtags_template. "
            "creator_profiles: recent posts from usernames in usernames_template (e.g. upstream scout)."
        ),
    )
    hashtags_template: str = (
        "{{ instagram_hashtags | default(topic | replace(' ', ','), true) }}"
    )
    usernames_template: str = "{{ upstream['instagram_creator_scout']['text'] | trim }}"
    result_limit: Annotated[int, Field(ge=1, le=50)] = 12
    posts_per_profile: Annotated[int, Field(ge=5, le=50)] = 12


class SerperSourceParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query_template: str = "{{ niche | default('trends') }}"


class ScrapeURLParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url_template: str


class MemoryQueryParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query_template: str
    top_k: Annotated[int, Field(ge=1, le=40)] | None = None


class MemoryWriteParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content_id_template: str | None = None
    topic_template: str
    hook_template: str
    platform_template: str = "twitter"
    angle_template: str = "general"
    predicted_score_template: str = "50"


class TransformTemplateParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template: str


class OutputPiecesParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    include_node_metadata: bool = True
    campaign_node_id: str | None = Field(
        default=None,
        description=(
            "Optional node id whose JSON/text output should be parsed as the creator campaign result "
            "and exposed on final_output.campaign_result."
        ),
    )


class EvidenceItem(BaseModel):
    """A source-backed proof point shown in the campaign evidence drawer."""

    model_config = ConfigDict(extra="forbid")

    source: str
    title: str
    url: str | None = None
    metric: str | None = None
    quote_or_summary: str
    relevance: str


class CreatorPersona(BaseModel):
    """Reusable creator voice and positioning profile for campaign generation."""

    model_config = ConfigDict(extra="forbid")

    voice_summary: str
    tone_traits: list[str] = Field(default_factory=list)
    humor_style: str | None = None
    content_formats: list[str] = Field(default_factory=list)
    audience: str
    recurring_themes: list[str] = Field(default_factory=list)
    visual_style: str | None = None
    caption_patterns: list[str] = Field(default_factory=list)
    do_say: list[str] = Field(default_factory=list)
    do_not_say: list[str] = Field(default_factory=list)
    example_hooks: list[str] = Field(default_factory=list)
    persona_prompt: str
    instagram_profile: str | None = Field(
        default=None,
        description="Optional public Instagram username or profile URL used with consent to infer style.",
    )


class TrendOpportunity(BaseModel):
    """A ranked trend that can become a creator-ready campaign."""

    model_config = ConfigDict(extra="forbid")

    title: str
    why_now: str
    audience: str
    evidence: list[EvidenceItem] = Field(default_factory=list)
    confidence: Annotated[float, Field(ge=0, le=1)]
    risk: str | None = None
    recommended_platforms: list[str] = Field(default_factory=list)


class PlatformAsset(BaseModel):
    """A platform-native content asset in the selected campaign."""

    model_config = ConfigDict(extra="forbid")

    platform: str
    format: str
    hook: str
    body: str
    script: str | None = None
    caption: str | None = None
    cta: str
    production_notes: str | None = None


class VisualAsset(BaseModel):
    """Visual direction or generation prompt for the campaign."""

    model_config = ConfigDict(extra="forbid")

    asset_type: str
    concept: str
    prompt: str
    on_screen_text: list[str] = Field(default_factory=list)
    production_notes: str | None = None


class PostingPlanItem(BaseModel):
    """One step in the recommended publish sequence."""

    model_config = ConfigDict(extra="forbid")

    order: int = Field(ge=1)
    platform: str
    timing: str
    asset_ref: str
    purpose: str
    repurposing_notes: str | None = None


class CampaignPack(BaseModel):
    """The selected trend turned into platform assets, visuals, and a posting plan."""

    model_config = ConfigDict(extra="forbid")

    selected_trend: TrendOpportunity
    campaign_big_idea: str
    platform_assets: list[PlatformAsset] = Field(default_factory=list)
    visual_assets: list[VisualAsset] = Field(default_factory=list)
    posting_plan: list[PostingPlanItem] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)


class CampaignResult(BaseModel):
    """Creator-facing workflow result emitted by campaign templates."""

    model_config = ConfigDict(extra="forbid")

    creator_persona: CreatorPersona
    trend_opportunities: list[TrendOpportunity] = Field(default_factory=list)
    campaign_pack: CampaignPack
    markdown_summary: str | None = None


# Leonardo Nano Banana 2 documented edge sizes (pixels). Invalid combinations silently
# default to 1:1 on Leonardo; enforcing membership catches obvious typos before spend.
_LEONARDO_NANO_WIDTHS_PX: frozenset[int] = frozenset(
    (
        768,
        848,
        896,
        928,
        1024,
        1152,
        1200,
        1264,
        1376,
        1536,
        1584,
        1696,
        1792,
        1856,
        2048,
        2304,
        2400,
        2528,
        2752,
        3072,
        3168,
        3392,
        3584,
        3712,
        4096,
        4608,
        4800,
        5056,
        5504,
        6336,
    )
)
_LEONARDO_NANO_HEIGHTS_PX: frozenset[int] = frozenset(
    (
        672,
        768,
        848,
        896,
        928,
        1024,
        1152,
        1200,
        1264,
        1344,
        1376,
        1536,
        1696,
        1792,
        1856,
        2048,
        2304,
        2400,
        2528,
        2688,
        2752,
        3072,
        3392,
        3584,
        3712,
        4096,
        4608,
        4800,
        5056,
        5504,
    )
)


class OpenAIImageParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_model: Literal["flux_dev", "nano_banana_2", "gpt_image_2"] = Field(
        ...,
        title="Image model",
        description="Choose Leonardo FLUX Dev, Nano Banana 2, or GPT Image 2 before running.",
    )
    prompt_template: str = Field(
        ...,
        title="Image instructions",
        description=(
            "What the model should paint. Plain language is fine; the studio can optionally "
            "append your topic or output from your Brief step."
        ),
    )
    model_id: str | None = Field(
        default="b2614463-296c-462a-9586-aafdb8f00e36",
        title="FLUX model UUID",
        description="Used only when image model is FLUX Dev.",
    )
    model: str | None = Field(
        default=None,
        title="Legacy model (deprecated)",
        description="Backwards compatibility field for older saved workflows.",
    )
    quality: Literal["LOW", "MEDIUM", "HIGH"] | None = Field(
        default=None,
        title="Quality (GPT Image 2)",
        description="Used only for GPT Image 2 (`LOW`, `MEDIUM`, `HIGH`).",
    )
    size: str | None = Field(
        default=None,
        title="Legacy size (deprecated)",
        description="Unused for Leonardo FLUX Dev; use width/height instead.",
    )
    input_images_template: str | None = Field(
        default=None,
        title="Legacy reference image paths (deprecated)",
        description="Unused for Leonardo FLUX Dev in this node.",
    )
    mask_image_path_template: str | None = Field(
        default=None,
        title="Legacy mask image path (deprecated)",
        description="Unused for Leonardo FLUX Dev in this node.",
    )
    contrast: float = Field(
        default=3.5,
        title="Contrast",
        description="Detail strength: 3 (low), 3.5 (medium), 4 (high).",
    )
    num_images: Annotated[int, Field(ge=1, le=8)] = Field(
        default=1,
        title="Images to generate",
        description="How many images to create per run.",
    )
    width: Annotated[int, Field(ge=256, le=6336)] = Field(
        default=1024,
        title="Width",
        description=(
            "Output width in pixels (FLUX commonly up to ~2048; Nano Banana supports up "
            "to 6336). For Nano Banana, use a Leonardo-documented width paired with "
            "a documented height."
        ),
    )
    height: Annotated[int, Field(ge=256, le=6336)] = Field(
        default=1024,
        title="Height",
        description=(
            "Output height in pixels (FLUX commonly up to ~2048; Nano Banana supports "
            "up to 5504). Pair with width per Leonardo Nano Banana sizing tables."
        ),
    )
    style_uuid: str | None = Field(
        default=None,
        title="Style UUID",
        description=(
            'Optional Leonardo style preset UUID; omitted when empty. '
            "Leonardo “None” style is `556c1ee5-ec38-42e8-955a-1e82dad0ffa1`. "
            "For Nano Banana, Dynamic is `111dc692-d470-4eec-b791-3475abac4c46`. "
            "FLUX uses this field as `styleUUID` when set."
        ),
    )
    enhance_prompt: bool = Field(
        default=False,
        title="Enhance prompt",
        description=(
            "Let Leonardo refine the prompt: FLUX `enhancePrompt`; Nano Banana 2 maps to "
            "`prompt_enhance` `\"ON\"` / `\"OFF\"`."
        ),
    )
    enhance_prompt_instruction: str | None = Field(
        default=None,
        title="Enhance instruction",
        description="Optional extra instruction used when prompt enhancement is enabled.",
    )
    seed: Annotated[int | None, Field(ge=0, le=2147483638)] = Field(
        default=None,
        title="Seed",
        description="Optional fixed seed for reproducible outputs.",
    )
    ultra: bool | None = Field(
        default=None,
        title="Ultra mode",
        description="Optional Leonardo ultra generation mode.",
    )
    timeout_seconds: Annotated[int, Field(ge=15, le=600)] = Field(
        default=120,
        title="Generation timeout (seconds)",
        description="How long to wait for Leonardo to finish before failing.",
    )

    @field_validator("quality", mode="before")
    @classmethod
    def _normalize_quality(cls, value: Any) -> Any:
        # Older saved workflows sometimes persist empty string for optional enums.
        if isinstance(value, str):
            cleaned = value.strip()
            if not cleaned:
                return None
            return cleaned.upper()
        return value

    @model_validator(mode="after")
    def _validate_leonardo_nano_dimensions(self) -> Self:
        if self.image_model == "nano_banana_2":
            w, h = int(self.width), int(self.height)
            bad: list[str] = []
            if w not in _LEONARDO_NANO_WIDTHS_PX:
                bad.append(f"width {w}px is not a Leonardo-listed Nano Banana width")
            if h not in _LEONARDO_NANO_HEIGHTS_PX:
                bad.append(f"height {h}px is not a Leonardo-listed Nano Banana height")
            if bad:
                raise ValueError(
                    "; ".join(bad)
                    + ". Use a documented pixel size from Leonardo's Nano Banana 2 sizing tables."
                )
            return self
        if self.image_model != "gpt_image_2":
            return self
        w, h = int(self.width), int(self.height)
        long, short = max(w, h), min(w, h)
        pixels = w * h
        if long >= 3840:
            raise ValueError("GPT Image 2 requires max(width, height) < 3840.")
        if w % 16 != 0 or h % 16 != 0:
            raise ValueError("GPT Image 2 requires both width and height to be multiples of 16.")
        if short <= 0 or (long / short) > 3:
            raise ValueError("GPT Image 2 aspect ratio must be at most 3:1.")
        if pixels < 655_360 or pixels > 8_294_400:
            raise ValueError("GPT Image 2 pixel count must be between 655,360 and 8,294,400.")
        return self


class RunStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class RunEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["run_started", "node_started", "node_finished", "node_failed", "run_finished"]
    run_id: str
    ts: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    node_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class WorkflowRunCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workflow_id: str | None = None
    workflow: WorkflowSpec | None = None
    inputs: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _need_workflow(self) -> WorkflowRunCreate:
        if self.workflow is None and not self.workflow_id:
            raise ValueError("Provide `workflow` inline or `workflow_id` to load from disk.")
        return self


class WorkflowRunState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    status: RunStatus
    workflow_snapshot: WorkflowSpec | None = None
    inputs: dict[str, Any] = Field(default_factory=dict)
    node_outputs: dict[str, dict[str, Any]] = Field(default_factory=dict)
    final_output: dict[str, Any] | None = None
    error: str | None = None


class WorkflowUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spec: WorkflowSpec

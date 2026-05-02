/**
 * Friendly, human-readable metadata for each node kind.
 *
 * The backend `/workflows/node-types` endpoint returns machine JSON Schemas; this
 * catalog adds copy, icons, and guided controls so the Workflow Studio reads
 * like a creator tool — not a schema dump.
 */
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BrainCircuit,
  Database,
  FileText,
  Globe,
  Image as ImageIcon,
  Newspaper,
  Play,
  Search,
  Sparkles,
  Workflow,
} from "lucide-react";

export type NodeCategory =
  | "trigger"
  | "source"
  | "agent"
  | "transform"
  | "memory"
  | "media"
  | "output";

/** Guided inspector controls that rebuild template strings for the workflow payload */
export type EasyInspectorField =
  | "reddit_subreddits"
  | "search_query_parts"
  | "url_or_input"
  | "image_generation_prompt";

export interface NodeCatalogEntry {
  /** stable backend node-type id (matches workflow handler registry) */
  type: string;
  /** human-friendly title shown on the node card and library */
  label: string;
  /** one-line elevator pitch */
  short: string;
  /** longer explanation, shown in the inspector */
  description: string;
  category: NodeCategory;
  icon: LucideIcon;
  /** params keys to display as a one-line preview on the node card */
  previewKeys?: string[];
  /** keys whose value should be edited via a multi-line textarea, not <input> */
  longTextKeys?: string[];
  /** keys that accept Jinja-style {{ var }} templating (UI hint only) */
  templateKeys?: string[];
  /** Guided fields — UI builds JSON-safe template strings automatically */
  easyInspector?: Partial<Record<string, EasyInspectorField>>;
  /** Params shown under a collapsible “optional” block (paths, tuning, etc.) */
  inspectorAdvancedKeys?: string[];
  /** Summary line for that collapsible region */
  inspectorAdvancedSummary?: string;
}

export const CATEGORY_META: Record<
  NodeCategory,
  { label: string; tint: string; ring: string; chip: string }
> = {
  trigger: {
    label: "Triggers",
    tint: "from-amber-500/20 to-amber-500/5",
    ring: "ring-amber-500/40",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  source: {
    label: "Sources",
    tint: "from-sky-500/20 to-sky-500/5",
    ring: "ring-sky-500/40",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  agent: {
    label: "AI Agents",
    tint: "from-violet-500/20 to-violet-500/5",
    ring: "ring-violet-500/40",
    chip: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
  transform: {
    label: "Transforms",
    tint: "from-emerald-500/20 to-emerald-500/5",
    ring: "ring-emerald-500/40",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  memory: {
    label: "Memory",
    tint: "from-fuchsia-500/20 to-fuchsia-500/5",
    ring: "ring-fuchsia-500/40",
    chip: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  },
  media: {
    label: "Media",
    tint: "from-rose-500/20 to-rose-500/5",
    ring: "ring-rose-500/40",
    chip: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  output: {
    label: "Outputs",
    tint: "from-zinc-400/20 to-zinc-400/5",
    ring: "ring-zinc-400/40",
    chip: "bg-muted text-muted-foreground border-border dark:bg-zinc-400/15 dark:text-zinc-200 dark:border-zinc-400/30",
  },
};

const CATALOG: NodeCatalogEntry[] = [
  {
    type: "trigger.input",
    label: "Topic",
    short: "Type the topic you want researched.",
    description:
      "Type the subject you want a deep viral content & marketing analysis on. Downstream nodes can reference it as {{ topic }}.",
    category: "trigger",
    icon: Play,
    previewKeys: ["default_topic"],
  },
  {
    type: "source.reddit",
    label: "Reddit signals",
    short: "Pulls top posts from one or more subreddits.",
    description:
      "Fetches hot/recent submissions from the listed subreddits and exposes a text digest downstream. Use for grounding agents in real audience language.",
    category: "source",
    icon: Newspaper,
    previewKeys: ["subreddits_template", "limit"],
    templateKeys: ["subreddits_template"],
    easyInspector: { subreddits_template: "reddit_subreddits" },
  },
  {
    type: "source.serper",
    label: "Web search (Serper)",
    short: "Google search via Serper.dev.",
    description:
      "Runs a Google-powered query and returns ranked results as text. Good for fresh trend/news context. Requires SERPER_API_KEY.",
    category: "source",
    icon: Search,
    previewKeys: ["query_template"],
    templateKeys: ["query_template"],
    easyInspector: { query_template: "search_query_parts" },
  },
  {
    type: "source.scrape_url",
    label: "Scrape URL",
    short: "Fetches and extracts text from a webpage.",
    description:
      "Visits a single URL and pulls its readable text content. URL accepts {{ templating }} from upstream outputs.",
    category: "source",
    icon: Globe,
    previewKeys: ["url_template"],
    templateKeys: ["url_template"],
    easyInspector: { url_template: "url_or_input" },
  },
  {
    type: "agent.crewai",
    label: "AI agent",
    short: "Runs a single CrewAI agent task.",
    description:
      "Spins up a one-shot CrewAI agent with the given role/goal/backstory, runs the task description against upstream context, and returns the raw text.",
    category: "agent",
    icon: Bot,
    previewKeys: ["role"],
    longTextKeys: [
      "task_description_template",
      "expected_output",
      "backstory",
      "goal",
    ],
    templateKeys: ["task_description_template", "expected_output"],
  },
  {
    type: "transform.template",
    label: "Template transform",
    short: "Render a Jinja template against context.",
    description:
      "Renders a Jinja template using upstream outputs and run inputs. Perfect for merging multiple signal streams into one prompt.",
    category: "transform",
    icon: Sparkles,
    longTextKeys: ["template"],
    templateKeys: ["template"],
  },
  {
    type: "memory.query",
    label: "Memory query",
    short: "Semantic search on the performance DB.",
    description:
      "Embeds the query and returns top-k similar past pieces from Chroma. Use to ground new ideas in what historically performed.",
    category: "memory",
    icon: BrainCircuit,
    previewKeys: ["query_template", "top_k"],
    templateKeys: ["query_template"],
    easyInspector: { query_template: "search_query_parts" },
  },
  {
    type: "memory.write",
    label: "Memory write",
    short: "Persist a piece + score into Chroma.",
    description:
      "Writes a content snippet (topic, hook, platform, angle, predicted score) into the Chroma collection so future runs can retrieve it.",
    category: "memory",
    icon: Database,
    previewKeys: ["topic_template", "platform_template"],
    templateKeys: [
      "content_id_template",
      "topic_template",
      "hook_template",
      "platform_template",
      "angle_template",
      "predicted_score_template",
    ],
  },
  {
    type: "media.gemini_image",
    label: "Image (GPT)",
    short: "Create images from plain-language instructions.",
    description:
      "Describe what should be on screen. You can optionally pull words from your topic or from your Brief step without typing code. Saves PNGs in the run; previews show in Run progress.",
    category: "media",
    icon: ImageIcon,
    longTextKeys: ["input_images_template", "mask_image_path_template"],
    easyInspector: { prompt_template: "image_generation_prompt" },
    inspectorAdvancedKeys: ["model", "quality", "size", "input_images_template", "mask_image_path_template"],
    inspectorAdvancedSummary: "Optional: model, size & files on disk",
  },
  {
    type: "output.pieces",
    label: "Collect output",
    short: "Bundles upstream outputs as the final result.",
    description:
      "Terminal node — gathers everything produced upstream into the run's final_output. You'll see the bundled JSON in the run drawer.",
    category: "output",
    icon: FileText,
    previewKeys: ["include_node_metadata"],
  },
];

const FALLBACK: NodeCatalogEntry = {
  type: "unknown",
  label: "Unknown node",
  short: "This block runs with the parameters shown beside it.",
  description:
    "This handler isn't in the curated catalog yet. Use the labelled fields above when available — no separate JSON mode.",
  category: "transform",
  icon: Workflow,
};

const BY_TYPE: Record<string, NodeCatalogEntry> = Object.fromEntries(
  CATALOG.map((c) => [c.type, c]),
);

export function getCatalogEntry(type: string): NodeCatalogEntry {
  return BY_TYPE[type] ?? { ...FALLBACK, type, label: type };
}

export function listCatalog(): NodeCatalogEntry[] {
  return CATALOG;
}

export function groupCatalog(): Array<{
  category: NodeCategory;
  entries: NodeCatalogEntry[];
}> {
  const order: NodeCategory[] = [
    "trigger",
    "source",
    "agent",
    "transform",
    "memory",
    "media",
    "output",
  ];
  return order
    .map((cat) => ({
      category: cat,
      entries: CATALOG.filter((c) => c.category === cat),
    }))
    .filter((g) => g.entries.length > 0);
}

export type TemplateCatalogCategory = "general" | "usecase";

export interface TemplateMeta {
  id: string;
  label: string;
  description: string;
  /** One short line for compact cards (e.g. empty canvas). Full `description` for tooltips & sidebar. */
  tagline?: string;
  badge?: string;
  category?: TemplateCatalogCategory;
}

const GENERAL_TEMPLATE_ORDER: readonly string[] = [
  "avcm_classic",
  "avcm_with_images",
  "research_only",
  "tweet_only",
];

const USECASE_TEMPLATE_ORDER: readonly string[] = [
  "saas_launch",
  "personal_brand",
  "ecommerce",
  "youtube",
  "competitor_teardown",
];

function sortIdsWithPreferredOrder(ids: string[], preferred: readonly string[]): string[] {
  const pick = new Set(ids);
  const out: string[] = [];
  for (const id of preferred) {
    if (pick.has(id)) out.push(id);
  }
  const rest = ids.filter((id) => !out.includes(id)).sort((a, b) => a.localeCompare(b));
  return [...out, ...rest];
}

/** Split API template ids into UI groups; unknown templates default to `general`. */
export function partitionTemplateIds(remoteIds: string[]): {
  general: string[];
  usecase: string[];
} {
  const usecase: string[] = [];
  const general: string[] = [];
  for (const id of remoteIds) {
    const cat = templateMeta(id).category ?? "general";
    if (cat === "usecase") usecase.push(id);
    else general.push(id);
  }
  return {
    general: sortIdsWithPreferredOrder(general, GENERAL_TEMPLATE_ORDER),
    usecase: sortIdsWithPreferredOrder(usecase, USECASE_TEMPLATE_ORDER),
  };
}

export const TEMPLATE_META: Record<string, TemplateMeta> = {
  avcm_classic: {
    id: "avcm_classic",
    label: "Launchy Virality",
    description:
      "Reddit + Serper signals → psych → angles → copy → creative brief → score.",
    tagline: "Research, angles, copy, and scoring",
    badge: "Recommended",
    category: "general",
  },
  avcm_with_images: {
    id: "avcm_with_images",
    label: "Pipeline with hero image",
    description:
      "Full research-through-score flow plus one GPT-generated hero image from your topic and brief.",
    tagline: "Same growth pipeline plus an AI hero image",
    category: "general",
  },
  research_only: {
    id: "research_only",
    label: "Research only",
    description: "Subreddit discovery + Reddit + web search signals only.",
    tagline: "Reddit + web search only—no long agent chain",
    category: "general",
  },
  tweet_only: {
    id: "tweet_only",
    label: "Tweet draft",
    description: "One timely tweet draft from your topic—no wiring required.",
    tagline: "One tweet from your topic—minimal graph",
    category: "general",
  },
  saas_launch: {
    id: "saas_launch",
    label: "SaaS Product Launch",
    description: "Launch psychology, demos, traction hooks, PH/LI/X cadence—all from topic + signals.",
    tagline: "Launch-ready copy for SaaS and Product Hunt",
    category: "usecase",
  },
  personal_brand: {
    id: "personal_brand",
    label: "Personal Brand Growth",
    description: "Authority angles, LinkedIn + X drafts, credibility hooks from audience language.",
    tagline: "Authority angles for LinkedIn and X",
    category: "usecase",
  },
  ecommerce: {
    id: "ecommerce",
    label: "E-commerce / D2C",
    description: "UGC angles, PAS/AIDA conversions, Meta + TikTok + email stubs from shopper signals.",
    tagline: "D2C angles grounded in shopper language",
    category: "usecase",
  },
  youtube: {
    id: "youtube",
    label: "YouTube Content Strategy",
    description: "Titles, thumbnails, beat sheets, Shorts—from retention-first packaging prompts.",
    tagline: "Titles, retention beats, and Shorts ideas",
    category: "usecase",
  },
  competitor_teardown: {
    id: "competitor_teardown",
    label: "Competitor Teardown",
    description: "C.A.R.D.-style intel, gap angles, balanced counter-positioning copy.",
    tagline: "Fair teardowns and counter-positioning",
    category: "usecase",
  },
};

export function templateMeta(id: string): TemplateMeta {
  const known = TEMPLATE_META[id]
  if (known) return known
  const slug =
    id
      .replace(/^avcm_/i, "")
      .replace(/_/g, " ")
      .trim() || id.replace(/_/g, " ")
  const human = slug
    .split(/\s+/)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(" ")
  return {
    id,
    label: human,
    description: "Workflow template bundled with Launchy.",
    category: "general",
  }
}

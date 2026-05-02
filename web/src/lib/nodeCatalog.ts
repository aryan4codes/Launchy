/**
 * Friendly, human-readable metadata for each node kind.
 *
 * The backend `/workflows/node-types` endpoint returns raw JSON-Schemas; this
 * catalog adds the personality (label, description, icon, color, "what does
 * this node do at a glance" hints) so the UI never feels like a JSON editor.
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
export type EasyInspectorField = "reddit_subreddits" | "search_query_parts" | "url_or_input";

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
    label: "Workflow inputs",
    short: "Entry point — exposes run inputs to downstream nodes.",
    description:
      "Every workflow starts here. The values you pass when running the workflow (e.g. niche, subreddits, platforms) become available to downstream nodes via {{ key }} templates.",
    category: "trigger",
    icon: Play,
    previewKeys: ["keys"],
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
    label: "GPT image",
    short: "Generate or edit images via OpenAI.",
    description:
      "Uses the OpenAI Image API: text-only prompts call images.generate (gpt-image-2). Set input_images_template to one or more pipe-separated file paths (after Jinja) to use images.edit; optional mask_image_path_template for masked edits. Saves PNGs under the run; the run drawer previews them.",
    category: "media",
    icon: ImageIcon,
    longTextKeys: ["prompt_template", "input_images_template", "mask_image_path_template"],
    templateKeys: ["prompt_template", "input_images_template", "mask_image_path_template"],
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
  short: "No catalog entry — using raw JSON editor.",
  description:
    "This node type isn't in the UI catalog yet. You can still edit its parameters with the Advanced JSON view in the inspector.",
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

export interface TemplateMeta {
  id: string;
  label: string;
  description: string;
  badge?: string;
}

export const TEMPLATE_META: Record<string, TemplateMeta> = {
  avcm_classic: {
    id: "avcm_classic",
    label: "AVCM Classic",
    description:
      "Reddit + Serper signals → psych → angles → copy → creative brief → score.",
    badge: "Recommended",
  },
  avcm_with_images: {
    id: "avcm_with_images",
    label: "AVCM with images",
    description: "Classic flow plus Gemini image generation per piece.",
  },
  research_only: {
    id: "research_only",
    label: "Research only",
    description: "Just the signal-gathering half of the pipeline.",
  },
  tweet_only: {
    id: "tweet_only",
    label: "Tweet draft",
    description: "Minimal flow that drafts a single tweet from a niche.",
  },
};

export function templateMeta(id: string): TemplateMeta {
  return (
    TEMPLATE_META[id] ?? {
      id,
      label: id,
      description: "Template",
    }
  );
}

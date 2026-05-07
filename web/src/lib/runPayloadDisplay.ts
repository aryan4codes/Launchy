import { apiUrl } from "@/lib/apiOrigin";
import { getCatalogEntry } from "@/lib/nodeCatalog";

/** Resolve artifact URL — dev proxy (relative) vs production `VITE_API_ORIGIN` (absolute). */
export function artifactUrl(path: string): string {
  const rel = path.replace(/^outputs\/?/, "").replace(/^\/+/, "");
  return apiUrl(`/artifacts/${rel}`);
}

function fullArtifactUrl(path: string): string {
  const u = artifactUrl(path);
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${window.location.origin}${u}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Handler output flat on record or nested under legacy `output` key */
function unwrapOutput(rec: Record<string, unknown>): Record<string, unknown> {
  const inner = rec.output;
  if (isRecord(inner)) return inner;
  return rec;
}

export function pathsFromPayloadRecord(rec: Record<string, unknown>): string[] {
  const src = unwrapOutput(rec);
  const acc: string[] = [];
  if (typeof src.image_path === "string" && src.image_path.trim())
    acc.push(src.image_path.trim());
  const imgs = src.images;
  if (Array.isArray(imgs)) {
    for (const x of imgs) {
      if (typeof x === "string" && x.trim()) acc.push(x.trim());
    }
  }
  return [...new Set(acc)];
}

const TEXT_KEYS = ["text", "raw", "prompt", "expected_output"] as const;

export function textsFromPayloadRecord(rec: Record<string, unknown>): { field: string; content: string }[] {
  const src = unwrapOutput(rec);
  const out: { field: string; content: string }[] = [];
  for (const key of TEXT_KEYS) {
    const v = src[key];
    if (typeof v !== "string" || !v.trim()) continue;
    out.push({ field: key, content: v.trim() });
  }
  return out;
}

/**
 * Pick best text from a node output.
 * Prefers `text`, falls back to `raw`, then `prompt`.
 * Returns null if nothing useful.
 */
function bestTextFromPayloadRecord(rec: Record<string, unknown>): { field: string; content: string } | null {
  const src = unwrapOutput(rec);
  for (const key of TEXT_KEYS) {
    const v = src[key];
    if (typeof v === "string" && v.trim()) return { field: key, content: v.trim() };
  }
  return null;
}

export type ParsedRunBlob = {
  runId?: string | null;
  status?: string | null;
  error?: string | null;
  workflowName?: string | null;
};

export function parseRunMeta(payload: unknown): ParsedRunBlob {
  if (!isRecord(payload)) return {};
  return {
    runId: typeof payload.run_id === "string" ? payload.run_id : null,
    status: typeof payload.status === "string" ? payload.status : null,
    error: typeof payload.error === "string" ? payload.error : null,
    workflowName:
      isRecord(payload.workflow) && typeof payload.workflow.name === "string"
        ? payload.workflow.name
        : null,
  };
}

/** Image paths for thumbnails (backward compat with drawer). */
export function imageUrlsFromRunPayload(payload: unknown): string[] {
  const imgs: string[] = [];
  const fo = payload && isRecord(payload) ? payload.final_output : undefined;
  const fb = fo ?? (payload && isRecord(payload) ? payload.node_outputs : undefined);

  walkForImages(fb, imgs);
  return [...new Set(imgs)];
}

function walkForImages(blob: unknown, acc: string[]) {
  const nodes =
    blob && isRecord(blob) ? (blob.nodes as Record<string, unknown> | undefined) : undefined;
  if (!nodes) return;

  for (const v of Object.values(nodes)) {
    if (!isRecord(v)) continue;
    if (isRecord(v.nodes)) {
      walkForImages(v, acc);
      continue;
    }
    acc.push(...pathsFromPayloadRecord(v));
  }
}

export type DisplayTextBlock = { nodeLabel: string; field: string; body: string };
export type DisplayImageBlock = { path: string; nodeLabel: string; href: string; copyHref: string };

/** Rich copy-friendly sections for `/results/:id`. */
export function extractRunSections(payload: unknown): {
  texts: DisplayTextBlock[];
  images: DisplayImageBlock[];
} {
  const texts: DisplayTextBlock[] = [];
  const imgs: DisplayImageBlock[] = [];
  const seenText = new Set<string>();
  const seenPaths = new Set<string>();

  const fo = payload && isRecord(payload) ? payload.final_output : undefined;

  walkForDisplay(isRecord(fo) ? fo : undefined, texts, imgs, "", seenText, seenPaths);

  if (!texts.length && !imgs.length && isRecord(payload) && isRecord(payload.node_outputs)) {
    walkForDisplay(payload.node_outputs as Record<string, unknown>, texts, imgs, "", seenText, seenPaths);
  }

  return { texts, images: imgs };
}

function walkForDisplay(
  blob: unknown,
  texts: DisplayTextBlock[],
  imgs: DisplayImageBlock[],
  prefix: string,
  seenText: Set<string>,
  seenPaths: Set<string>,
) {
  const nodes =
    blob && isRecord(blob) ? (blob.nodes as Record<string, unknown> | undefined) : undefined;
  if (!nodes) return;

  for (const [nid, raw] of Object.entries(nodes)) {
    if (!isRecord(raw)) continue;

    const label = prefix ? `${prefix} › ${nid}` : nid;

    if (isRecord(raw.nodes)) {
      walkForDisplay(raw, texts, imgs, label, seenText, seenPaths);
      continue;
    }

    for (const p of pathsFromPayloadRecord(raw)) {
      if (seenPaths.has(p)) continue;
      seenPaths.add(p);
      imgs.push({
        path: p,
        nodeLabel: label,
        href: artifactUrl(p),
        copyHref: fullArtifactUrl(p),
      });
    }

    for (const { field, content } of textsFromPayloadRecord(raw)) {
      const key = `${field}:${content}`;
      if (seenText.has(key)) continue;
      seenText.add(key);
      texts.push({ nodeLabel: label, field, body: content });
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// Node-grouped extraction (v2) — for the rich results page
// ──────────────────────────────────────────────────────────────────

export type NodeOutputBlock = {
  nodeId: string;
  nodeType: string | null;
  markdown: string;
  images: DisplayImageBlock[];
};

/** Node definition from the workflow spec embedded in the run payload */
type NodeSpec = { id: string; type: string; data?: Record<string, unknown> };

function nodeSpecsFromPayload(payload: unknown): Map<string, NodeSpec> {
  const map = new Map<string, NodeSpec>();
  if (!isRecord(payload)) return map;
  const wf = payload.workflow;
  if (!isRecord(wf)) return map;
  const nodes = wf.nodes;
  if (!Array.isArray(nodes)) return map;
  for (const n of nodes) {
    if (isRecord(n) && typeof n.id === "string" && typeof n.type === "string") {
      map.set(n.id, n as unknown as NodeSpec);
    }
  }
  return map;
}

/**
 * Extract per-node output blocks, deduplicating text vs raw (keeps best one).
 * Preserves original node ordering from the workflow spec when available.
 */
export function extractNodeOutputs(payload: unknown): NodeOutputBlock[] {
  if (!isRecord(payload)) return [];
  const specs = nodeSpecsFromPayload(payload);

  const fo = payload.final_output;
  let nodesMap: Record<string, unknown> | undefined;

  if (isRecord(fo) && isRecord((fo as Record<string, unknown>).nodes)) {
    nodesMap = (fo as Record<string, unknown>).nodes as Record<string, unknown>;
  }
  if (
    !nodesMap &&
    isRecord(payload.node_outputs) &&
    isRecord((payload.node_outputs as Record<string, unknown>).nodes)
  ) {
    nodesMap = (payload.node_outputs as Record<string, unknown>).nodes as Record<string, unknown>;
  }
  if (!nodesMap) return [];

  const blocks: NodeOutputBlock[] = [];

  const orderedIds = specs.size > 0 ? [...specs.keys()] : Object.keys(nodesMap);

  for (const nid of orderedIds) {
    const raw = nodesMap[nid];
    if (!isRecord(raw)) continue;

    const spec = specs.get(nid);
    const nodeType = spec?.type ?? null;

    if (nodeType === "trigger.input" || nodeType === "output.pieces") continue;

    const best = bestTextFromPayloadRecord(raw);
    const images: DisplayImageBlock[] = [];
    for (const p of pathsFromPayloadRecord(raw)) {
      images.push({
        path: p,
        nodeLabel: nid,
        href: artifactUrl(p),
        copyHref: fullArtifactUrl(p),
      });
    }

    if (!best && images.length === 0) continue;

    blocks.push({
      nodeId: nid,
      nodeType,
      markdown: best?.content ?? "",
      images,
    });
  }

  return blocks;
}

/** Inputs object from the run */
export function extractInputs(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.inputs)) return payload.inputs as Record<string, unknown>;
  return null;
}

/** True when the saved workflow graph includes the Instagram Apify source node. */
export function workflowIncludesInstagramSource(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  const wf = payload.workflow;
  if (!isRecord(wf)) return false;
  const nodes = wf.nodes;
  if (!Array.isArray(nodes)) return false;
  return nodes.some((n) => isRecord(n) && n.type === "source.instagram");
}

const PACK_IDS = ["copy", "creative_brief", "score"] as const;
const STRATEGY_IDS = ["psych", "angles"] as const;
/** Agents whose job is to set up data for other nodes (e.g. subreddit discovery). */
const RESEARCH_AGENT_IDS = ["subreddit_researcher"] as const;

export type ResultsBoardPartition = {
  researchAgents: NodeOutputBlock[];
  sources: NodeOutputBlock[];
  transforms: NodeOutputBlock[];
  strategyAgents: NodeOutputBlock[];
  middleAgents: NodeOutputBlock[];
  deliverablesOrdered: NodeOutputBlock[];
  other: NodeOutputBlock[];
};

/** Group outputs for dashboard layout (Launchy results board; safe on unknown workflows). */
export function partitionResultsBoard(blocks: NodeOutputBlock[]): ResultsBoardPartition {
  const sources: NodeOutputBlock[] = [];
  const transforms: NodeOutputBlock[] = [];
  const agents: NodeOutputBlock[] = [];
  const other: NodeOutputBlock[] = [];

  for (const b of blocks) {
    const cat = getCatalogEntry(b.nodeType ?? "unknown").category;
    if (cat === "source") sources.push(b);
    else if (cat === "transform") transforms.push(b);
    else if (cat === "agent") agents.push(b);
    else other.push(b);
  }

  const byId = new Map(agents.map((a) => [a.nodeId, a]));

  const researchAgents: NodeOutputBlock[] = [];
  for (const id of RESEARCH_AGENT_IDS) {
    const x = byId.get(id);
    if (x) researchAgents.push(x);
  }

  const deliverablesOrdered: NodeOutputBlock[] = [];
  for (const id of PACK_IDS) {
    const x = byId.get(id);
    if (x) deliverablesOrdered.push(x);
  }

  const strategyAgents: NodeOutputBlock[] = [];
  for (const id of STRATEGY_IDS) {
    const x = byId.get(id);
    if (x) strategyAgents.push(x);
  }

  const used = new Set<string>(
    [...researchAgents, ...deliverablesOrdered, ...strategyAgents].map((b) => b.nodeId),
  );
  const middleAgents = agents.filter((a) => !used.has(a.nodeId));

  return {
    researchAgents,
    sources,
    transforms,
    strategyAgents,
    middleAgents,
    deliverablesOrdered,
    other,
  };
}

/** Phases shown in the horizontal pipeline strip. */
export function pipelineStagesFromPartition(p: ResultsBoardPartition): string[] {
  const stages: string[] = [];
  if (p.researchAgents.length) stages.push("Topic research");
  if (p.sources.length) stages.push("Community signals");
  if (p.transforms.length) stages.push("Combined insights");
  if (p.strategyAgents.length) stages.push("Audience psychology");
  if (p.middleAgents.length) stages.push("Angles and drafts");
  if (p.deliverablesOrdered.length) stages.push("Launch pack");
  if (!stages.length) stages.push("Analysis");
  return stages;
}

// ──────────────────────────────────────────────────────────────────
// Creator campaign extraction — for `/campaigns/:id`
// ──────────────────────────────────────────────────────────────────

export type CreatorPersonaDisplay = {
  voiceSummary: string | null;
  toneTraits: string[];
  audience: string | null;
  contentFormats: string[];
  recurringThemes: string[];
  visualStyle: string | null;
  doSay: string[];
  doNotSay: string[];
};

export type TrendOpportunityDisplay = {
  title: string;
  whyNow: string | null;
  audience: string | null;
  confidence: string | null;
  risk: string | null;
  recommendedPlatforms: string[];
  evidence: EvidenceItemDisplay[];
};

export type PlatformAssetDisplay = {
  platform: string;
  format: string | null;
  hook: string | null;
  body: string;
  caption: string | null;
  cta: string | null;
  productionNotes: string | null;
};

export type VisualDirectionDisplay = {
  title: string;
  prompt: string;
  notes: string[];
};

export type PostingPlanItemDisplay = {
  timing: string;
  action: string;
  channel: string | null;
};

export type EvidenceItemDisplay = {
  source: string | null;
  title: string;
  url: string | null;
  metric: string | null;
  summary: string | null;
};

export type CampaignDisplayModel = {
  hasCampaignShape: boolean;
  topic: string | null;
  persona: CreatorPersonaDisplay | null;
  topRecommendation: string | null;
  campaignBigIdea: string | null;
  selectedTrendTitle: string | null;
  trendOpportunities: TrendOpportunityDisplay[];
  platformAssets: PlatformAssetDisplay[];
  visualDirections: VisualDirectionDisplay[];
  postingPlan: PostingPlanItemDisplay[];
  evidence: EvidenceItemDisplay[];
  fallbackBlocks: NodeOutputBlock[];
};

const CAMPAIGN_KEYS = [
  "creator_persona",
  "persona",
  "trend_opportunities",
  "trendOpportunities",
  "campaign_pack",
  "campaignPack",
  "platform_assets",
  "platformAssets",
  "posting_plan",
  "postingPlan",
  "evidence",
];

function valueByKeys(rec: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in rec) return rec[key];
  }
  return undefined;
}

function stringValue(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function selectedTrendTitleValue(packRecord: Record<string, unknown>): string | null {
  const selectedTrendValue = valueByKeys(packRecord, ["selected_trend", "selectedTrend"]);
  return (
    (isRecord(selectedTrendValue)
      ? stringValue(valueByKeys(selectedTrendValue, ["title", "trend", "name", "opportunity"]))
      : stringValue(selectedTrendValue)) ??
    stringValue(valueByKeys(packRecord, ["trend_title", "trendTitle"]))
  );
}

function stringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(stringValue).filter((x): x is string => Boolean(x));
  const s = stringValue(v);
  if (!s) return [];
  return s
    .split(/\n|,/)
    .map((part) => part.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function recordList(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v.filter(isRecord);
  return isRecord(v) ? [v] : [];
}

function looksCampaignLike(rec: Record<string, unknown>): boolean {
  return CAMPAIGN_KEYS.some((key) => key in rec);
}

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  const candidates = [
    text.trim(),
    ...[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) => match[1]?.trim() ?? ""),
  ].filter(Boolean);

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (isRecord(parsed)) return parsed;
    } catch {
      // Keep scanning; older runs often wrap JSON in prose.
    }
  }
  return null;
}

function collectCampaignCandidates(payload: unknown, nodeBlocks: NodeOutputBlock[]): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];
  const visit = (v: unknown, depth = 0) => {
    if (depth > 5) return;
    if (typeof v === "string") {
      const parsed = tryParseJsonObject(v);
      if (parsed) visit(parsed, depth + 1);
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) visit(item, depth + 1);
      return;
    }
    if (!isRecord(v)) return;
    if (looksCampaignLike(v)) candidates.push(v);
    for (const nested of Object.values(v)) visit(nested, depth + 1);
  };

  visit(payload);
  for (const block of nodeBlocks) {
    if (block.markdown) visit(block.markdown);
  }
  return candidates;
}

function normalizeEvidence(v: unknown): EvidenceItemDisplay[] {
  return recordList(v).map((item, index) => ({
    source: stringValue(valueByKeys(item, ["source", "platform", "type"])),
    title:
      stringValue(valueByKeys(item, ["title", "headline", "name"])) ??
      `Evidence ${index + 1}`,
    url: stringValue(valueByKeys(item, ["url", "link", "href"])),
    metric: stringValue(valueByKeys(item, ["metric", "score", "engagement", "count"])),
    summary: stringValue(valueByKeys(item, ["quote_or_summary", "summary", "quote", "relevance", "why_it_matters"])),
  }));
}

function normalizePersona(v: unknown): CreatorPersonaDisplay | null {
  if (!isRecord(v)) return null;
  const persona: CreatorPersonaDisplay = {
    voiceSummary: stringValue(valueByKeys(v, ["voice_summary", "voiceSummary", "summary", "persona_prompt"])),
    toneTraits: stringList(valueByKeys(v, ["tone_traits", "toneTraits", "tone", "traits"])),
    audience: stringValue(valueByKeys(v, ["audience", "target_audience", "targetAudience"])),
    contentFormats: stringList(valueByKeys(v, ["content_formats", "contentFormats", "formats"])),
    recurringThemes: stringList(valueByKeys(v, ["recurring_themes", "recurringThemes", "themes", "topics"])),
    visualStyle: stringValue(valueByKeys(v, ["visual_style", "visualStyle", "aesthetic"])),
    doSay: stringList(valueByKeys(v, ["do_say", "doSay"])),
    doNotSay: stringList(valueByKeys(v, ["do_not_say", "doNotSay", "avoid"])),
  };
  return Object.values(persona).some((value) => (Array.isArray(value) ? value.length : Boolean(value)))
    ? persona
    : null;
}

function normalizeTrend(v: unknown): TrendOpportunityDisplay | null {
  if (!isRecord(v)) return null;
  const title = stringValue(valueByKeys(v, ["title", "trend", "name", "opportunity"]));
  if (!title) return null;
  return {
    title,
    whyNow: stringValue(valueByKeys(v, ["why_now", "whyNow", "why", "rationale"])),
    audience: stringValue(valueByKeys(v, ["audience", "target_audience", "targetAudience"])),
    confidence: stringValue(valueByKeys(v, ["confidence", "score"])),
    risk: stringValue(valueByKeys(v, ["risk", "watchout", "concern"])),
    recommendedPlatforms: stringList(valueByKeys(v, ["recommended_platforms", "recommendedPlatforms", "platforms"])),
    evidence: normalizeEvidence(valueByKeys(v, ["evidence", "sources", "proof"])).slice(0, 4),
  };
}

function normalizeAsset(v: unknown): PlatformAssetDisplay | null {
  if (!isRecord(v)) return null;
  const platform = stringValue(valueByKeys(v, ["platform", "channel", "destination"])) ?? "Campaign";
  const body =
    stringValue(valueByKeys(v, ["body", "script", "post", "copy", "text"])) ??
    stringValue(valueByKeys(v, ["caption", "hook"]));
  if (!body) return null;
  return {
    platform,
    format: stringValue(valueByKeys(v, ["format", "type"])),
    hook: stringValue(valueByKeys(v, ["hook", "opening", "headline"])),
    body,
    caption: stringValue(valueByKeys(v, ["caption", "short_caption", "shortCaption"])),
    cta: stringValue(valueByKeys(v, ["cta", "call_to_action", "callToAction"])),
    productionNotes: stringValue(valueByKeys(v, ["production_notes", "productionNotes", "notes"])),
  };
}

function normalizeVisual(v: unknown, index: number): VisualDirectionDisplay | null {
  if (typeof v === "string" && v.trim()) {
    return { title: `Visual direction ${index + 1}`, prompt: v.trim(), notes: [] };
  }
  if (!isRecord(v)) return null;
  const prompt = stringValue(valueByKeys(v, ["prompt", "image_prompt", "imagePrompt", "description", "concept"]));
  if (!prompt) return null;
  return {
    title: stringValue(valueByKeys(v, ["title", "name", "format"])) ?? `Visual direction ${index + 1}`,
    prompt,
    notes: stringList(valueByKeys(v, ["notes", "frames", "shot_list", "shotList", "on_screen_text", "onScreenText"])),
  };
}

function normalizePlanItem(v: unknown, index: number): PostingPlanItemDisplay | null {
  if (typeof v === "string" && v.trim()) {
    return { timing: `Step ${index + 1}`, action: v.trim(), channel: null };
  }
  if (!isRecord(v)) return null;
  const action = stringValue(valueByKeys(v, ["action", "post", "task", "description", "copy"]));
  if (!action) return null;
  return {
    timing: stringValue(valueByKeys(v, ["timing", "day", "time", "sequence"])) ?? `Step ${index + 1}`,
    action,
    channel: stringValue(valueByKeys(v, ["channel", "platform", "destination"])),
  };
}

function mergeCampaignRecords(records: Record<string, unknown>[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const rec of records) {
    for (const [key, value] of Object.entries(rec)) {
      if (merged[key] === undefined) merged[key] = value;
    }
  }
  return merged;
}

export function extractCampaignDisplay(payload: unknown): CampaignDisplayModel {
  const fallbackBlocks = extractNodeOutputs(payload);
  const inputs = extractInputs(payload);
  const topic =
    stringValue(inputs?.topic) ??
    stringValue(inputs?.niche) ??
    stringValue(inputs?.campaign_topic) ??
    null;

  const campaignRecords = collectCampaignCandidates(payload, fallbackBlocks);
  const campaignRoot = mergeCampaignRecords(campaignRecords);
  const pack = valueByKeys(campaignRoot, ["campaign_pack", "campaignPack"]);
  const packRecord = isRecord(pack) ? pack : campaignRoot;

  const trendOpportunities = recordList(
    valueByKeys(campaignRoot, ["trend_opportunities", "trendOpportunities", "trends", "opportunities"]),
  )
    .map(normalizeTrend)
    .filter((x): x is TrendOpportunityDisplay => Boolean(x));

  const platformSource =
    valueByKeys(packRecord, ["platform_assets", "platformAssets", "assets", "deliverables"]) ??
    valueByKeys(campaignRoot, ["platform_assets", "platformAssets"]);
  let platformAssets = recordList(platformSource)
    .map(normalizeAsset)
    .filter((x): x is PlatformAssetDisplay => Boolean(x));

  if (!platformAssets.length) {
    platformAssets = fallbackBlocks
      .filter((block) => ["copy", "creative_brief", "campaign_strategist"].includes(block.nodeId) && block.markdown)
      .slice(0, 4)
      .map((block) => ({
        platform: block.nodeId === "copy" ? "Multi-platform copy" : block.nodeId.replaceAll("_", " "),
        format: "Draft",
        hook: null,
        body: block.markdown,
        caption: null,
        cta: null,
        productionNotes: "Imported from the workflow output.",
      }));
  }

  const visualSource =
    valueByKeys(packRecord, ["visual_assets", "visualAssets", "visual_plan", "visualPlan", "visual_direction"]) ??
    valueByKeys(campaignRoot, ["visual_assets", "visualAssets", "visualPlan"]);
  const visualDirections = (Array.isArray(visualSource) ? visualSource : visualSource ? [visualSource] : [])
    .map(normalizeVisual)
    .filter((x): x is VisualDirectionDisplay => Boolean(x));

  const planSource =
    valueByKeys(packRecord, ["posting_plan", "postingPlan", "schedule", "sequence"]) ??
    valueByKeys(campaignRoot, ["posting_plan", "postingPlan"]);
  const postingPlan = (Array.isArray(planSource) ? planSource : planSource ? [planSource] : [])
    .map(normalizePlanItem)
    .filter((x): x is PostingPlanItemDisplay => Boolean(x));

  const evidence = [
    ...normalizeEvidence(valueByKeys(packRecord, ["evidence", "sources", "proof"])),
    ...trendOpportunities.flatMap((trend) => trend.evidence),
  ].filter((item, index, all) => all.findIndex((x) => `${x.title}:${x.url}` === `${item.title}:${item.url}`) === index);

  const campaignBigIdea = stringValue(
    valueByKeys(packRecord, ["campaign_big_idea", "campaignBigIdea", "big_idea", "bigIdea", "idea"]),
  );
  const selectedTrendTitle = selectedTrendTitleValue(packRecord);

  return {
    hasCampaignShape: campaignRecords.length > 0,
    topic,
    persona: normalizePersona(valueByKeys(campaignRoot, ["creator_persona", "creatorPersona", "persona"])),
    topRecommendation:
      stringValue(valueByKeys(packRecord, ["top_recommendation", "topRecommendation", "recommendation"])) ??
      campaignBigIdea,
    campaignBigIdea,
    selectedTrendTitle,
    trendOpportunities,
    platformAssets,
    visualDirections,
    postingPlan,
    evidence,
    fallbackBlocks,
  };
}

import { getCatalogEntry } from "@/lib/nodeCatalog";

/** Resolve `/artifacts/<path>` (works with dev proxy and same-origin APIs). */
export function artifactUrl(path: string): string {
  const rel = path.replace(/^outputs\/?/, "").replace(/^\/+/, "");
  return `/artifacts/${rel}`;
}

function fullArtifactUrl(path: string): string {
  return `${window.location.origin}${artifactUrl(path)}`;
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

const PACK_IDS = ["copy", "creative_brief", "score"] as const;
const STRATEGY_IDS = ["psych", "angles"] as const;

export type ResultsBoardPartition = {
  sources: NodeOutputBlock[];
  transforms: NodeOutputBlock[];
  strategyAgents: NodeOutputBlock[];
  middleAgents: NodeOutputBlock[];
  deliverablesOrdered: NodeOutputBlock[];
  other: NodeOutputBlock[];
};

/** Group outputs for dashboard layout (AVCM-aligned; safe on unknown workflows). */
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
    [...deliverablesOrdered, ...strategyAgents].map((b) => b.nodeId),
  );
  const middleAgents = agents.filter((a) => !used.has(a.nodeId));

  return {
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
  if (p.sources.length) stages.push("Signals");
  if (p.transforms.length) stages.push("Fused context");
  if (p.strategyAgents.length) stages.push("Psychology map");
  if (p.middleAgents.length) stages.push("Angles & drafts");
  if (p.deliverablesOrdered.length) stages.push("Launch pack");
  if (!stages.length) stages.push("Analysis");
  return stages;
}

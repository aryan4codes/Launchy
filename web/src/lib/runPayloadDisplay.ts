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
    /** Aggregator node nests another `nodes` map */
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

  if (!texts.length && !imgs.length && payload && isRecord(payload.node_outputs)) {
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

/**
 * Browser-local library of persona and campaign summaries for future creator runs.
 * Not synced — device-only.
 */
import type { CampaignDisplayModel } from "@/lib/runPayloadDisplay";

const KEY_PERSONAS = "launchy_creator_personas_v1";
const KEY_CAMPAIGNS = "launchy_creator_campaigns_v1";
const MAX_ITEMS = 25;

export type SavedPersonaSnippet = {
  id: string;
  label: string;
  summary: string;
  savedAt: string;
  sourceRunId?: string;
};

export type SavedCampaignSnippet = {
  id: string;
  label: string;
  summary: string;
  savedAt: string;
  sourceRunId?: string;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readPersonas(): SavedPersonaSnippet[] {
  if (typeof localStorage === "undefined") return [];
  return safeParse<SavedPersonaSnippet[]>(localStorage.getItem(KEY_PERSONAS), []);
}

function readCampaigns(): SavedCampaignSnippet[] {
  if (typeof localStorage === "undefined") return [];
  return safeParse<SavedCampaignSnippet[]>(localStorage.getItem(KEY_CAMPAIGNS), []);
}

function writePersonas(items: SavedPersonaSnippet[]) {
  localStorage.setItem(KEY_PERSONAS, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

function writeCampaigns(items: SavedCampaignSnippet[]) {
  localStorage.setItem(KEY_CAMPAIGNS, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function listSavedPersonas(): SavedPersonaSnippet[] {
  return readPersonas();
}

export function listSavedCampaigns(): SavedCampaignSnippet[] {
  return readCampaigns();
}

export function savePersonaSnippet(entry: Omit<SavedPersonaSnippet, "id" | "savedAt"> & { id?: string }): SavedPersonaSnippet {
  const row: SavedPersonaSnippet = {
    id: entry.id ?? crypto.randomUUID(),
    label: entry.label.slice(0, 200),
    summary: entry.summary.slice(0, 12000),
    savedAt: new Date().toISOString(),
    sourceRunId: entry.sourceRunId,
  };
  const rest = readPersonas().filter((p) => p.id !== row.id);
  writePersonas([row, ...rest]);
  return row;
}

export function saveCampaignSnippet(
  entry: Omit<SavedCampaignSnippet, "id" | "savedAt"> & { id?: string },
): SavedCampaignSnippet {
  const row: SavedCampaignSnippet = {
    id: entry.id ?? crypto.randomUUID(),
    label: entry.label.slice(0, 200),
    summary: entry.summary.slice(0, 12000),
    savedAt: new Date().toISOString(),
    sourceRunId: entry.sourceRunId,
  };
  const rest = readCampaigns().filter((p) => p.id !== row.id);
  writeCampaigns([row, ...rest]);
  return row;
}

export function deletePersonaSnippet(id: string) {
  writePersonas(readPersonas().filter((p) => p.id !== id));
}

export function deleteCampaignSnippet(id: string) {
  writeCampaigns(readCampaigns().filter((p) => p.id !== id));
}

/** Plain-language persona recap for downstream prompts. */
export function summarizePersonaFromDisplay(model: CampaignDisplayModel): string {
  const lines: string[] = [];
  if (model.persona?.voiceSummary) lines.push(model.persona.voiceSummary);
  if (model.persona?.toneTraits?.length) lines.push(`Tone: ${model.persona.toneTraits.join(", ")}.`);
  if (model.persona?.contentFormats?.length) lines.push(`Formats: ${model.persona.contentFormats.join(", ")}.`);
  if (model.persona?.audience) lines.push(`Audience: ${model.persona.audience}.`);
  return lines.join(" ").trim() || "Prior run persona (structured data was thin).";
}

/** Campaign outcome recap for continuity across runs. */
export function summarizeCampaignFromDisplay(model: CampaignDisplayModel): string {
  const lines: string[] = [];
  if (model.topic) lines.push(`Topic: ${model.topic}.`);
  if (model.topRecommendation) lines.push(`Lead angle: ${model.topRecommendation}`);
  if (model.selectedTrendTitle) lines.push(`Selected trend: ${model.selectedTrendTitle}.`);
  if (model.campaignBigIdea) lines.push(`Big idea: ${model.campaignBigIdea}`);
  if (model.trendOpportunities[0]?.title) {
    lines.push(`Example opportunity: ${model.trendOpportunities[0].title}.`);
  }
  return lines.join(" ").trim() || "Prior campaign run (add a label when saving).";
}

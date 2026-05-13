import { API_ORIGIN, apiUrl } from "@/lib/apiOrigin";

export type WorkflowSpecJson = {
  id?: string | null;
  name: string;
  nodes: Array<{
    id: string;
    type: string;
    data: Record<string, unknown>;
    position?: { x: number; y: number } | null;
  }>;
  edges: Array<{
    id?: string | null;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }>;
};

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function fetchNodeTypeSchemas(): Promise<Record<string, unknown>> {
  return j(await fetch(apiUrl("/workflows/node-types")));
}

export async function listTemplates(): Promise<string[]> {
  const r = await j<{ templates: string[] }>(await fetch(apiUrl("/workflows/templates")));
  return r.templates;
}

export async function getTemplate(id: string): Promise<WorkflowSpecJson> {
  return j(await fetch(apiUrl(`/workflows/templates/${encodeURIComponent(id)}`)));
}

export async function cloneTemplate(templateId: string, name: string): Promise<WorkflowSpecJson> {
  return j(
    await fetch(apiUrl("/workflows/clone-template"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId, name }),
    }),
  );
}

export async function listStoredWorkflows(): Promise<string[]> {
  const r = await j<{ workflows: string[] }>(await fetch(apiUrl("/workflows")));
  return r.workflows;
}

export async function getWorkflow(id: string): Promise<WorkflowSpecJson> {
  return j(await fetch(apiUrl(`/workflows/${encodeURIComponent(id)}`)));
}

export async function createWorkflow(spec: WorkflowSpecJson): Promise<WorkflowSpecJson> {
  return j(
    await fetch(apiUrl("/workflows"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: spec.name,
        nodes: spec.nodes,
        edges: spec.edges,
      }),
    }),
  );
}

export async function putWorkflow(id: string, spec: WorkflowSpecJson): Promise<WorkflowSpecJson> {
  const merged: WorkflowSpecJson = { ...spec, id };
  return j(
    await fetch(apiUrl(`/workflows/${encodeURIComponent(id)}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    }),
  );
}

export async function startCreatorRun(body: {
  topic: string
  create_images: boolean
  audience?: string
  creator_persona?: string
  tone_traits?: string[]
  content_formats?: string[]
  platforms?: string
  instagram_url?: string | null
  prior_context?: string | null
}): Promise<{ run_id: string; workflow_id: string }> {
  return j(
    await fetch(apiUrl('/creator-runs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function startWorkflowRun(
  workflowId: string,
  inputs: Record<string, unknown>,
): Promise<{ run_id: string }> {
  return j(
    await fetch(apiUrl("/workflow-runs"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_id: workflowId, inputs }),
    }),
  );
}

export async function getWorkflowRun(runId: string): Promise<unknown> {
  return j(await fetch(apiUrl(`/workflow-runs/${encodeURIComponent(runId)}`)));
}

// --- Voice / Twin ---
export type VoiceSampleRow = { kind: string; value: string };

export type ReelTranscription = {
  reel_index: number;
  shortcode: string;
  url: string;
  caption: string;
  transcript: string;
};

export type VoiceProfile = {
  profile_id: string;
  creator_name: string;
  sample_count: number;
  tone_descriptors: string[];
  vocabulary_signature: string[];
  sentence_style: string;
  do_list: string[];
  dont_list: string[];
  example_hooks: string[];
  /** On-camera / spoken delivery notes when reels were transcribed. */
  delivery_style?: string;
  summary_block: string;
  created_at: string;
  updated_at: string;
  transcriptions?: ReelTranscription[];
};

/** SSE events emitted by POST /voice/profiles/stream */
export type VoiceStreamEvent =
  | { type: 'step'; step: string; msg: string; index?: number; total?: number; reel_count?: number; handle?: string; shortcode?: string }
  | { type: 'transcription'; reel_index: number; shortcode: string; url: string; caption: string; transcript: string }
  | { type: 'heartbeat' }
  | { type: 'done'; profile: VoiceProfile }
  | { type: 'error'; detail: string };

export async function listVoiceProfiles(): Promise<VoiceProfile[]> {
  return j(await fetch(apiUrl('/voice/profiles')));
}

export async function createVoiceProfile(payload: {
  creator_name: string;
  samples: VoiceSampleRow[];
}): Promise<VoiceProfile> {
  return j(
    await fetch(apiUrl('/voice/profiles'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

/**
 * Streaming version of profile creation. Calls `onEvent` for every SSE event and
 * resolves with the final VoiceProfile when the stream completes.
 */
export function createVoiceProfileStream(
  payload: { creator_name: string; samples: VoiceSampleRow[] },
  onEvent: (event: VoiceStreamEvent) => void,
): Promise<VoiceProfile> {
  return new Promise((resolve, reject) => {
    fetch(apiUrl('/voice/profiles/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) return reject(new Error(`${res.status} ${await res.text()}`));
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const evt = JSON.parse(line.slice(6)) as VoiceStreamEvent;
              if (evt.type === 'done') {
                resolve(evt.profile);
                return;
              }
              if (evt.type === 'error') {
                reject(new Error(evt.detail));
                return;
              }
              onEvent(evt);
            } catch {
              // ignore parse errors on malformed lines
            }
          }
        }
        reject(new Error('Stream ended without completion'));
      })
      .catch(reject);
  });
}

/** Re-collect samples and re-run the profiler (PUT). */
export async function updateVoiceProfile(
  profileId: string,
  body: { creator_name?: string; samples: VoiceSampleRow[] },
): Promise<VoiceProfile> {
  return j(
    await fetch(apiUrl(`/voice/profiles/${encodeURIComponent(profileId)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function patchVoiceLists(
  profileId: string,
  body: { do_list?: string[]; dont_list?: string[] },
): Promise<VoiceProfile> {
  return j(
    await fetch(apiUrl(`/voice/profiles/${encodeURIComponent(profileId)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteVoiceProfile(profileId: string): Promise<void> {
  const r = await fetch(apiUrl(`/voice/profiles/${encodeURIComponent(profileId)}`), {
    method: 'DELETE',
  });
  if (!r.ok) throw new Error(await r.text());
}

export async function twinCreateSession(body: {
  voice_profile_id?: string | null;
}): Promise<{ session_id: string }> {
  return j(
    await fetch(apiUrl('/twin/sessions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function twinListSessions(): Promise<
  { session_id: string; voice_profile_id: string | null; created_at: string; updated_at: string }[]
> {
  return j(await fetch(apiUrl('/twin/sessions')));
}

export async function twinGetSession(sessionId: string): Promise<{ meta: unknown; messages: unknown[] }> {
  return j(await fetch(apiUrl(`/twin/sessions/${encodeURIComponent(sessionId)}`)));
}

export async function twinPatchSession(
  sessionId: string,
  body: { voice_profile_id?: string | null },
): Promise<{ ok: boolean }> {
  return j(
    await fetch(apiUrl(`/twin/sessions/${encodeURIComponent(sessionId)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export function workflowRunWebSocketUrl(runId: string): string {
  if (API_ORIGIN) {
    const u = new URL(API_ORIGIN);
    const proto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${u.host}/workflow-runs/${encodeURIComponent(runId)}/ws`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/workflow-runs/${encodeURIComponent(runId)}/ws`;
}

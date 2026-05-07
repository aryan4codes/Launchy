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

export function workflowRunWebSocketUrl(runId: string): string {
  if (API_ORIGIN) {
    const u = new URL(API_ORIGIN);
    const proto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${u.host}/workflow-runs/${encodeURIComponent(runId)}/ws`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/workflow-runs/${encodeURIComponent(runId)}/ws`;
}

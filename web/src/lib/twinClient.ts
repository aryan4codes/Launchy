import { apiUrl } from "@/lib/apiOrigin";

export type TwinSseEvent =
  | { type: "token"; delta: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; summary: string }
  | {
      type: "action";
      kind: string;
      run_id: string;
      template_id?: string;
      results_url: string;
    }
  | { type: "done" }
  | { type: "error"; message: string };

/** POST message; stream SSE lines `data: {...}`. */
export async function streamTwinMessage(
  sessionId: string,
  payload: {
    content: string;
    tool_memory: boolean;
    tool_research: boolean;
    tool_workflow: boolean;
    tool_mongodb: boolean;
  },
  onEvent: (ev: TwinSseEvent) => void,
): Promise<void> {
  const res = await fetch(apiUrl(`/twin/sessions/${encodeURIComponent(sessionId)}/messages`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${t}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const block of parts) {
      const line = block
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice("data:".length).trim();
      if (!json) continue;
      try {
        const ev = JSON.parse(json) as TwinSseEvent;
        onEvent(ev);
      } catch {
        /* ignore malformed */
      }
    }
  }
}

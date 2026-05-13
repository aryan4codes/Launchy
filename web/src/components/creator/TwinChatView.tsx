import { BadgeCheck, Loader2, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { ThemeToggle } from "@/components/theme-toggle";
import { ActionCard } from "@/components/twin/ActionCard";
import { Composer } from "@/components/twin/Composer";
import { MessageBubble } from "@/components/twin/MessageBubble";
import { Button } from "@/components/ui/button";
import { listVoiceProfiles, twinCreateSession, twinGetSession, twinListSessions, twinPatchSession, type VoiceProfile } from "@/lib/api";
import { streamTwinMessage, type TwinSseEvent } from "@/lib/twinClient";

const LS_SESSION = "launchy_twin_session_id";
const LS_VOICE = "launchy_active_voice_profile";

const STARTERS = [
  "What should I post this week?",
  "Rewrite this in my voice: …",
  "What's trending on Reddit in [niche]?",
];

type UiTurn =
  | { id: string; kind: "user"; content: string }
  | { id: string; kind: "assistant"; content: string; streaming?: boolean }
  | { id: string; kind: "tool"; name: string; summary: string }
  | { id: string; kind: "action"; runId: string; resultsUrl: string; templateId?: string };

function randomId(): string {
  return `m-${crypto.randomUUID().slice(0, 12)}`;
}

function rowsFromStored(messages: unknown[]): UiTurn[] {
  const rows: UiTurn[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const role = o.role;
    const content = typeof o.content === "string" ? o.content : "";
    if (role === "user") rows.push({ id: randomId(), kind: "user", content });
    else if (role === "assistant" && content.trim())
      rows.push({ id: randomId(), kind: "assistant", content });
    else if (role === "tool") {
      const name = typeof o.name === "string" ? o.name : "tool";
      rows.push({ id: randomId(), kind: "tool", name, summary: content.slice(0, 400) });
    }
  }
  return rows;
}

export function TwinChatView() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(LS_SESSION) : null,
  );
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(LS_VOICE) : null,
  );
  const [sessions, setSessions] = useState<{ session_id: string; voice_profile_id: string | null }[]>([]);

  const [rows, setRows] = useState<UiTurn[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [toolMemory, setToolMemory] = useState(true);
  const [toolResearch, setToolResearch] = useState(true);
  const [toolWorkflow, setToolWorkflow] = useState(true);
  const [toolMongodb, setToolMongodb] = useState(true);

  const voiceLabel = useMemo(() => {
    if (!activeVoiceId) return "No voice profile";
    const v = voices.find((x) => x.profile_id === activeVoiceId);
    return v ? v.creator_name : activeVoiceId.slice(0, 8);
  }, [activeVoiceId, voices]);

  const refreshVoices = useCallback(async () => {
    try {
      setVoices(await listVoiceProfiles());
    } catch {
      setVoices([]);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await twinListSessions());
    } catch {
      setSessions([]);
    }
  }, []);

  const loadSessionRemote = useCallback(async (sid: string) => {
    const data = await twinGetSession(sid);
    setRows(rowsFromStored(data.messages ?? []));
  }, []);

  useEffect(() => {
    void refreshVoices();
    void refreshSessions();
  }, [refreshVoices, refreshSessions]);

  useEffect(() => {
    if (!sessionId) return;
    void loadSessionRemote(sessionId).catch(() => setRows([]));
  }, [sessionId, loadSessionRemote]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [rows, busy]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const { session_id } = await twinCreateSession({ voice_profile_id: activeVoiceId });
    localStorage.setItem(LS_SESSION, session_id);
    setSessionId(session_id);
    await refreshSessions();
    return session_id;
  };

  const onNewChat = async () => {
    const { session_id } = await twinCreateSession({ voice_profile_id: activeVoiceId });
    localStorage.setItem(LS_SESSION, session_id);
    setSessionId(session_id);
    setRows([]);
    await refreshSessions();
  };

  const onSend = async () => {
    const text = composer.trim();
    if (!text || busy) return;
    setComposer("");
    setBusy(true);
    const sid = await ensureSession();
    setRows((r) => [...r, { id: randomId(), kind: "user", content: text }]);

    const assistantId = randomId();
    setRows((r) => [...r, { id: assistantId, kind: "assistant", content: "", streaming: true }]);

    const applyToken = (delta: string) => {
      setRows((r) =>
        r.map((row) =>
          row.id === assistantId && row.kind === "assistant"
            ? { ...row, content: row.content + delta }
            : row,
        ),
      );
    };

    try {
      await streamTwinMessage(
        sid,
        {
          content: text,
          tool_memory: toolMemory,
          tool_research: toolResearch,
          tool_workflow: toolWorkflow,
          tool_mongodb: toolMongodb,
        },
        (ev: TwinSseEvent) => {
          if (ev.type === "token") applyToken(ev.delta);
          else if (ev.type === "tool_result")
            setRows((r) => [...r, { id: randomId(), kind: "tool", name: ev.name, summary: ev.summary }]);
          else if (ev.type === "action" && ev.kind === "workflow_run_started")
            setRows((r) => [
              ...r,
              {
                id: randomId(),
                kind: "action",
                runId: ev.run_id,
                resultsUrl: ev.results_url,
                templateId: ev.template_id,
              },
            ]);
          else if (ev.type === "error") applyToken(`\n\n[error] ${ev.message}`);
        },
      );
    } catch (e) {
      applyToken(`\n\n${e instanceof Error ? e.message : "Request failed"}`);
    } finally {
      setBusy(false);
      setRows((r) =>
        r.map((row) =>
          row.id === assistantId && row.kind === "assistant" ? { ...row, streaming: false } : row,
        ),
      );
    }
  };

  const switchVoiceForSession = async (vid: string | null) => {
    setActiveVoiceId(vid);
    if (vid) localStorage.setItem(LS_VOICE, vid);
    else localStorage.removeItem(LS_VOICE);
    if (sessionId) await twinPatchSession(sessionId, { voice_profile_id: vid });
  };

  const selectCls =
    "h-9 max-w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-900 shadow-sm dark:border-border dark:bg-card dark:text-foreground";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-[#f7f5f2] text-foreground shadow-sm dark:border-border dark:bg-background sm:rounded-3xl">
      <div className="pointer-events-none fixed inset-0 -z-20 dark:opacity-40">
        <div className="absolute -top-32 left-[-10%] h-[420px] w-[420px] rounded-full bg-stone-300/25 blur-[128px]" />
        <div className="absolute top-24 right-[-15%] h-[480px] w-[480px] rounded-full bg-amber-200/20 blur-[140px]" />
      </div>

      <header className="relative z-30 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-b border-zinc-200/60 bg-white/50 px-3 py-3 backdrop-blur-sm sm:px-5 dark:border-border dark:bg-card/40">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <MessageCircle className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-foreground">Twin</p>
            <p className="text-[11px] text-zinc-500 dark:text-muted-foreground">Chat session</p>
          </div>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
          <label className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-zinc-600 dark:text-muted-foreground">
            <span className="hidden sm:inline">Voice</span>
            <select
              className={`${selectCls} sm:max-w-[11rem]`}
              value={activeVoiceId ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                void switchVoiceForSession(v);
              }}
            >
              <option value="">None</option>
              {voices.map((v) => (
                <option key={v.profile_id} value={v.profile_id}>
                  {v.creator_name}
                </option>
              ))}
            </select>
            <span className="max-w-[5rem] truncate text-zinc-900 sm:hidden dark:text-foreground" title={voiceLabel}>
              {voiceLabel}
            </span>
          </label>
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 dark:text-muted-foreground">
            <span className="hidden sm:inline">Session</span>
            <select
              className={`${selectCls} max-w-[7.5rem] font-mono text-[10px]`}
              value={sessionId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                localStorage.setItem(LS_SESSION, v);
                setSessionId(v);
              }}
            >
              <option value="" disabled>
                Pick…
              </option>
              {sessions.map((s) => (
                <option key={s.session_id} value={s.session_id}>
                  {s.session_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <ThemeToggle />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-lg border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-border dark:bg-card dark:hover:bg-muted/50"
            onClick={() => void onNewChat()}
            disabled={busy}
          >
            New chat
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-3 pt-1 pb-6 sm:px-5">
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-border dark:bg-card">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-zinc-50/40 px-3 py-5 md:px-5 dark:bg-card"
            >
              {rows.length === 0 && !busy ? (
                <div className="mx-auto max-w-md space-y-6 px-1">
                  {!activeVoiceId ? (
                    <p className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5 text-center text-[13px] leading-snug text-zinc-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-zinc-100">
                      Select a voice profile under{" "}
                      <Link to="/twin?tab=train" className="font-medium text-zinc-950 underline decoration-zinc-400 underline-offset-2 dark:text-white">
                        Train voice
                      </Link>{" "}
                      for replies that match your tone.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-zinc-600 dark:text-muted-foreground">
                    <Link to="/twin?tab=train" className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-foreground">
                      Train voice
                    </Link>
                    <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                      ·
                    </span>
                    <Link to="/campaigns" className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-foreground">
                      Campaigns
                    </Link>
                    <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                      ·
                    </span>
                    <Link to="/studio" className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-foreground">
                      Studio
                    </Link>
                  </div>
                  <div>
                    <p className="text-center text-xs font-medium text-zinc-500 dark:text-muted-foreground">Suggestions</p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {STARTERS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted/40"
                          onClick={() => setComposer(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              {rows.map((row) => {
                if (row.kind === "user") return <MessageBubble key={row.id} role="user" content={row.content} />;
                if (row.kind === "assistant")
                  return (
                    <div key={row.id} className="space-y-1">
                      {row.streaming && row.content === "" && busy ? (
                        <div className="flex justify-start text-zinc-400">
                          <Loader2 className="h-4 w-4 animate-spin" aria-label="Thinking" />
                        </div>
                      ) : null}
                      {row.content ? <MessageBubble role="twin" content={row.content} /> : null}
                    </div>
                  );
                if (row.kind === "tool")
                  return (
                    <div
                      key={row.id}
                      className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-3 py-2.5 text-[11px] text-zinc-700 dark:border-border dark:bg-muted/30 dark:text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-1.5 font-medium text-zinc-900 dark:text-foreground">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {row.name}
                      </span>
                      <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px]">{row.summary}</pre>
                    </div>
                  );
                if (row.kind === "action")
                  return (
                    <ActionCard
                      key={row.id}
                      runId={row.runId}
                      resultsUrl={row.resultsUrl}
                      templateId={row.templateId}
                    />
                  );
                return null;
              })}
            </div>
            <div className="flex shrink-0 flex-wrap gap-3 border-t border-zinc-200 bg-zinc-50/60 px-3 py-2 md:hidden dark:border-border dark:bg-card/80">
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600 dark:text-muted-foreground">
                <input type="checkbox" className="accent-zinc-900 dark:accent-zinc-100" checked={toolMemory} onChange={(e) => setToolMemory(e.target.checked)} />
                Memory
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600 dark:text-muted-foreground">
                <input type="checkbox" className="accent-zinc-900 dark:accent-zinc-100" checked={toolResearch} onChange={(e) => setToolResearch(e.target.checked)} />
                Research
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600 dark:text-muted-foreground">
                <input type="checkbox" className="accent-zinc-900 dark:accent-zinc-100" checked={toolWorkflow} onChange={(e) => setToolWorkflow(e.target.checked)} />
                Workflows
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600 dark:text-muted-foreground">
                <input type="checkbox" className="accent-zinc-900 dark:accent-zinc-100" checked={toolMongodb} onChange={(e) => setToolMongodb(e.target.checked)} />
                Voice DB
              </label>
            </div>
            <Composer value={composer} onChange={setComposer} onSend={() => void onSend()} disabled={busy} />
          </div>

          <aside className="hidden w-48 shrink-0 flex-col rounded-2xl border border-zinc-200/90 bg-white p-3 text-[11px] shadow-sm md:flex dark:border-border dark:bg-card">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-muted-foreground">Tools</p>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-2.5 py-2 dark:border-border dark:bg-muted/20">
                <span className="font-medium text-zinc-800 dark:text-foreground">Memory</span>
                <input type="checkbox" className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100" checked={toolMemory} onChange={(e) => setToolMemory(e.target.checked)} />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-2.5 py-2 dark:border-border dark:bg-muted/20" title="Reddit topics + Serper web & news search (SERPER_API_KEY)">
                <span className="font-medium text-zinc-800 dark:text-foreground">Research</span>
                <input type="checkbox" className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100" checked={toolResearch} onChange={(e) => setToolResearch(e.target.checked)} />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-2.5 py-2 dark:border-border dark:bg-muted/20">
                <span className="font-medium text-zinc-800 dark:text-foreground">Workflows</span>
                <input type="checkbox" className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100" checked={toolWorkflow} onChange={(e) => setToolWorkflow(e.target.checked)} />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-2.5 py-2 dark:border-border dark:bg-muted/20">
                <span className="font-medium text-zinc-800 dark:text-foreground">Voice DB</span>
                <input type="checkbox" className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100" checked={toolMongodb} onChange={(e) => setToolMongodb(e.target.checked)} />
              </label>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default TwinChatView;

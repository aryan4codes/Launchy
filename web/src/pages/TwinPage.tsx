import {
  BadgeCheck,
  Flame,
  Loader2,
  MessageCircle,
  Sparkles,
  Stars,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { IntegrationPill } from "@/components/marketing/IntegrationPill";
import { LaunchyFlowExplainer } from "@/components/LaunchyFlowExplainer";
import { ScrollReveal, StaggerItem, StaggerReveal } from "@/components/motion/ScrollReveal";
import { ThemeToggle } from "@/components/theme-toggle";
import { ActionCard } from "@/components/twin/ActionCard";
import { Composer } from "@/components/twin/Composer";
import { MessageBubble } from "@/components/twin/MessageBubble";
import { Button } from "@/components/ui/button";
import { listVoiceProfiles, twinCreateSession, twinGetSession, twinListSessions, twinPatchSession, type VoiceProfile } from "@/lib/api";
import { MARKETING_INTEGRATIONS } from "@/lib/integrationBrands";
import { streamTwinMessage, type TwinSseEvent } from "@/lib/twinClient";

const LS_SESSION = "launchy_twin_session_id";
const LS_VOICE = "launchy_active_voice_profile";
const TWIN_INTEGRATIONS = MARKETING_INTEGRATIONS.slice(0, 6);

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

const STARTERS = [
  "What should I post about this week?",
  "Rewrite this paragraph in my voice: …",
  "Run a full SaaS launch campaign for [topic]",
  "What's trending in [niche] on Reddit right now?",
  "Ask the Twin to query memory for hooks similar to your niche.",
];

export default function TwinPage() {
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
    "h-10 max-w-full rounded-full border border-zinc-200/90 bg-white/95 px-3 text-xs font-medium text-zinc-900 shadow-sm backdrop-blur dark:border-border dark:bg-card dark:text-foreground";

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-hidden bg-[#fdf7ee] text-foreground dark:bg-background">
      <div className="pointer-events-none fixed inset-0 -z-20 dark:opacity-50">
        <div className="absolute -top-28 left-[-8%] h-[460px] w-[460px] rounded-full bg-fuchsia-300/38 blur-[140px]" />
        <div className="absolute top-20 right-[-12%] h-[500px] w-[500px] rounded-full bg-amber-300/38 blur-[155px]" />
        <div className="absolute bottom-[-12%] left-[18%] h-[400px] w-[400px] rounded-full bg-violet-300/32 blur-[140px]" />
        <div className="absolute bottom-[8%] right-[8%] h-[440px] w-[440px] rounded-full bg-emerald-300/28 blur-[145px]" />
      </div>

      <header className="relative z-30 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white shadow-md shadow-rose-300/40">
            <Sparkles className="h-4 w-4" />
          </span>
          Launchy{" "}
          <span className="bg-gradient-to-r from-violet-500 to-sky-500 bg-clip-text text-transparent">Twin</span>
        </Link>
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
          <Link
            to="/"
            className="hidden h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-3 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur md:inline-flex dark:border-border dark:bg-card dark:text-foreground"
          >
            Home
          </Link>
          <Link
            to="/campaigns"
            className="hidden h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-3 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur lg:inline-flex dark:border-border dark:bg-card dark:text-foreground"
          >
            Campaigns
          </Link>
          <Link
            to="/voice"
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-3 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur dark:border-border dark:bg-card dark:text-foreground"
          >
            Voice
          </Link>
          <Link
            to="/studio"
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-3 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur dark:border-border dark:bg-card dark:text-foreground"
          >
            Studio
          </Link>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 px-4 text-xs font-semibold text-white shadow-md shadow-rose-400/30 hover:opacity-95 disabled:opacity-50"
            onClick={() => void onNewChat()}
            disabled={busy}
          >
            New chat
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pb-6">
        <section className="relative mb-4 shrink-0 overflow-hidden rounded-[2rem] border border-white/70 bg-white/72 px-5 py-8 shadow-xl shadow-rose-200/25 backdrop-blur md:px-8 dark:border-border dark:bg-card/75 dark:shadow-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(20,20,20,0.06)_1px,transparent_0)] [background-size:24px_24px] dark:opacity-25" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-300/40 blur-3xl" />
          <div className="relative mx-auto max-w-3xl text-center">
            <StaggerReveal stagger={0.05} amount={0.08}>
              <StaggerItem>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm dark:border-violet-500/50 dark:bg-violet-950/40 dark:text-violet-200">
                  <Stars className="h-3.5 w-3.5" />
                  Digital Twin chat
                </div>
              </StaggerItem>
              <StaggerItem>
                <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.03em] text-zinc-950 md:text-4xl dark:text-foreground">
                  Ask in plain English.{" "}
                  <span className="bg-gradient-to-r from-fuchsia-500 via-rose-400 to-orange-400 bg-clip-text italic text-transparent">
                    Act in your voice.
                  </span>
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-700 dark:text-muted-foreground">
                  Tools for memory, research, and workflows stream back as the Twin replies. Pick a trained voice in the header so
                  answers match your tone.
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="mx-auto mt-5 flex flex-wrap justify-center gap-2">
                  {[
                    { label: "Trend aware", Icon: Flame, cls: "bg-amber-100 text-amber-800 ring-amber-200" },
                    { label: "Tooling", Icon: Wand2, cls: "bg-violet-100 text-violet-800 ring-violet-200" },
                    { label: "Chat-first", Icon: MessageCircle, cls: "bg-sky-100 text-sky-800 ring-sky-200" },
                  ].map(({ label, Icon, cls }) => (
                    <span key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${cls}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  ))}
                </div>
              </StaggerItem>
            </StaggerReveal>
          </div>
        </section>

        <ScrollReveal className="mb-4 shrink-0" duration={0.45} amount={0.12}>
          <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/65 px-3 py-4 shadow-md backdrop-blur dark:border-border dark:bg-card/70">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)] [background-size:40px_40px] dark:opacity-20" />
            <p className="relative text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-600 dark:text-fuchsia-400">
              Same stack as campaigns
            </p>
            <div className="relative mt-3 flex flex-wrap justify-center gap-2">
              {TWIN_INTEGRATIONS.map((b) => (
                <IntegrationPill key={b.label} {...b} />
              ))}
            </div>
          </div>
        </ScrollReveal>

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-2xl shadow-rose-200/20 ring-1 ring-black/[0.04] dark:border-border dark:bg-card/90 dark:shadow-none">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgba(20,20,20,0.04)_1px,transparent_0)] [background-size:20px_20px] px-3 py-4 md:px-5 dark:bg-card dark:[background-image:none]"
            >
              {rows.length === 0 && !busy ? (
                <div className="mx-auto max-w-lg space-y-4 px-1">
                  {!activeVoiceId ? (
                    <div className="rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-50 to-orange-50/80 px-4 py-3 text-left text-[12px] leading-snug text-amber-950 shadow-sm dark:border-amber-500/35 dark:from-amber-950/40 dark:to-orange-950/30 dark:text-amber-50">
                      <span className="font-semibold">No voice selected.</span> Replies won&apos;t track your tone until you choose one — train a profile on{" "}
                      <Link to="/voice" className="font-semibold underline-offset-4 hover:underline">
                        Voice
                      </Link>
                      .
                    </div>
                  ) : null}
                  <LaunchyFlowExplainer
                    variant="compact"
                    className="border-fuchsia-200/40 bg-white/90 dark:border-border dark:bg-muted/30"
                  />
                  <p className="text-center text-sm font-semibold text-zinc-800 dark:text-foreground">Suggested prompts</p>
                  <div className="flex flex-col gap-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 text-left text-xs font-medium text-zinc-900 shadow-sm transition hover:border-fuchsia-300/80 hover:shadow-md dark:border-border dark:bg-card dark:text-foreground"
                        onClick={() => setComposer(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {rows.map((row) => {
                if (row.kind === "user") return <MessageBubble key={row.id} role="user" content={row.content} />;
                if (row.kind === "assistant")
                  return (
                    <div key={row.id} className="space-y-1">
                      {row.streaming && row.content === "" && busy ? (
                        <div className="flex justify-start text-fuchsia-600 dark:text-fuchsia-400">
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
                      className="rounded-2xl border border-dashed border-violet-300/60 bg-violet-50/50 px-3 py-2.5 text-[11px] text-zinc-700 dark:border-violet-500/40 dark:bg-violet-950/20 dark:text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-1.5 font-semibold text-violet-800 dark:text-violet-200">
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
            <div className="flex shrink-0 flex-wrap gap-3 border-t border-fuchsia-200/40 bg-white/70 px-3 py-2 md:hidden dark:border-border dark:bg-card/80">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-700 dark:text-muted-foreground">
                <input type="checkbox" className="accent-fuchsia-600" checked={toolMemory} onChange={(e) => setToolMemory(e.target.checked)} />
                Memory
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-700 dark:text-muted-foreground">
                <input type="checkbox" className="accent-fuchsia-600" checked={toolResearch} onChange={(e) => setToolResearch(e.target.checked)} />
                Research
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-700 dark:text-muted-foreground">
                <input type="checkbox" className="accent-fuchsia-600" checked={toolWorkflow} onChange={(e) => setToolWorkflow(e.target.checked)} />
                Workflows
              </label>
            </div>
            <Composer value={composer} onChange={setComposer} onSend={() => void onSend()} disabled={busy} />
          </div>

          <aside className="hidden w-56 shrink-0 flex-col rounded-[2rem] border border-white/80 bg-white/80 p-4 text-[11px] shadow-lg ring-1 ring-black/[0.04] md:flex dark:border-border dark:bg-card/90 dark:ring-border">
            <div className="space-y-4">
              <p className="text-zinc-600 dark:text-muted-foreground">Tool groups for this session.</p>
              <label className="flex cursor-pointer flex-col gap-1 rounded-xl border border-zinc-200/60 bg-white/60 p-3 dark:border-border dark:bg-muted/20">
                <span className="font-semibold text-zinc-900 dark:text-foreground">Memory</span>
                <span className="font-normal text-[10px] text-zinc-600 dark:text-muted-foreground">Hooks from Launchy memory</span>
                <input type="checkbox" className="mt-1 h-4 w-4 accent-fuchsia-600" checked={toolMemory} onChange={(e) => setToolMemory(e.target.checked)} />
              </label>
              <label className="flex cursor-pointer flex-col gap-1 rounded-xl border border-zinc-200/60 bg-white/60 p-3 dark:border-border dark:bg-muted/20">
                <span className="font-semibold text-zinc-900 dark:text-foreground">Research</span>
                <span className="font-normal text-[10px] text-zinc-600 dark:text-muted-foreground">Reddit + web snippets</span>
                <input type="checkbox" className="mt-1 h-4 w-4 accent-fuchsia-600" checked={toolResearch} onChange={(e) => setToolResearch(e.target.checked)} />
              </label>
              <label className="flex cursor-pointer flex-col gap-1 rounded-xl border border-zinc-200/60 bg-white/60 p-3 dark:border-border dark:bg-muted/20">
                <span className="font-semibold text-zinc-900 dark:text-foreground">Workflows</span>
                <span className="font-normal text-[10px] text-zinc-600 dark:text-muted-foreground">Start DAG runs from chat</span>
                <input type="checkbox" className="mt-1 h-4 w-4 accent-fuchsia-600" checked={toolWorkflow} onChange={(e) => setToolWorkflow(e.target.checked)} />
              </label>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

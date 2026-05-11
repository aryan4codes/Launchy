import {
  ArrowRight,
  BadgeCheck,
  Mic,
  Sparkles,
  Stars,
  Trash2,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { IntegrationPill } from "@/components/marketing/IntegrationPill";
import { LaunchyFlowExplainer } from "@/components/LaunchyFlowExplainer";
import { ScrollReveal, StaggerItem, StaggerReveal } from "@/components/motion/ScrollReveal";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createVoiceProfile,
  deleteVoiceProfile,
  listVoiceProfiles,
  patchVoiceLists,
  updateVoiceProfile,
  type VoiceProfile,
  type VoiceSampleRow,
} from "@/lib/api";
import { MARKETING_INTEGRATIONS } from "@/lib/integrationBrands";

const LS_ACTIVE = "launchy_active_voice_profile";
const VOICE_LOGO_ROW = MARKETING_INTEGRATIONS.slice(0, 8);

/** UI row; backend expects kind `text`, `url`, or `reddit_user`. */
type SampleDraft = { kind: "text" | "url" | "reddit_user"; value: string };

function draftsToSamples(rows: SampleDraft[]): VoiceSampleRow[] {
  return rows
    .map((r) => ({ kind: r.kind || "text", value: r.value.trim() }))
    .filter((r) => r.value.length > 0);
}

function SampleEditor({
  drafts,
  onChange,
}: {
  drafts: SampleDraft[];
  onChange: (next: SampleDraft[]) => void;
}) {
  const append = () => onChange([...drafts, { kind: "text", value: "" }]);
  const updateAt = (i: number, patch: Partial<SampleDraft>) =>
    onChange(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const removeAt = (i: number) => onChange(drafts.filter((_d, j) => j !== i));

  const placeholder = (k: SampleDraft["kind"]) => {
    if (k === "text") return "Paste a post, caption, or thread excerpt…";
    if (k === "url") return "https://… (page Launchy will read)";
    return "reddit username (without u/)";
  };

  return (
    <div className="space-y-3">
      {drafts.map((d, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-2xl border border-white/80 bg-white/60 p-3 shadow-sm ring-1 ring-black/[0.04] sm:flex-row sm:items-start"
        >
          <select
            className="h-10 shrink-0 rounded-xl border border-violet-200 bg-white px-2 text-xs font-semibold text-zinc-900 dark:border-border dark:bg-white dark:text-zinc-950"
            value={d.kind}
            onChange={(e) => updateAt(i, { kind: e.target.value as SampleDraft["kind"] })}
          >
            <option value="text">Paste text</option>
            <option value="url">URL</option>
            <option value="reddit_user">Reddit user</option>
          </select>
          <Textarea
            className="min-h-[52px] flex-1 border-violet-200 bg-white text-sm text-zinc-950 placeholder:text-zinc-500 focus-visible:ring-violet-300 dark:border-border dark:bg-white"
            value={d.value}
            placeholder={placeholder(d.kind)}
            onChange={(e) => updateAt(i, { value: e.target.value })}
          />
          <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-xl" onClick={() => removeAt(i)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={append}>
        Add sample row
      </Button>
    </div>
  );
}

function ProfileCard({
  p,
  active,
  selected,
  onSelect,
  onSetActive,
  onDelete,
}: {
  p: VoiceProfile;
  active: boolean;
  selected: boolean;
  onSelect: () => void;
  onSetActive: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={
        "relative w-full overflow-hidden rounded-[1.5rem] border p-4 text-left shadow-md ring-1 transition hover:-translate-y-0.5 hover:shadow-lg " +
        (selected
          ? "border-fuchsia-300/80 bg-gradient-to-br from-fuchsia-50/90 via-rose-50/80 to-amber-50/90 ring-fuchsia-200/60 dark:border-fuchsia-400/40 dark:from-fuchsia-950/40 dark:via-rose-950/30 dark:to-amber-950/20"
          : "border-white/80 bg-white/85 ring-black/[0.04] dark:border-border dark:bg-card")
      }
    >
      <div className="pointer-events-none absolute -right-16 -top-12 h-36 w-36 rounded-full bg-rose-200/50 blur-2xl dark:opacity-40" />
      <div className="relative">
        <button type="button" className="w-full rounded-xl text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-fuchsia-400" onClick={onSelect}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-semibold text-zinc-950 dark:text-foreground">{p.creator_name}</div>
              <div className="mt-1 truncate font-mono text-[10px] text-zinc-600 dark:text-muted-foreground">{p.profile_id}</div>
            </div>
            {active ? (
              <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Active
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-700 dark:text-muted-foreground">{p.summary_block}</p>
        </button>
        <div className="mt-3 flex flex-wrap gap-2">
          {!active ? (
            <Button type="button" size="sm" variant="outline" className="rounded-full text-xs" onClick={onSetActive}>
              Set active
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full text-xs text-rose-700 hover:bg-rose-50 dark:text-rose-400"
            onClick={onDelete}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function VoicePreviewCard({ profile }: { profile: VoiceProfile | null }) {
  if (!profile) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-fuchsia-200/80 bg-white/60 p-8 text-center shadow-inner dark:border-border dark:bg-card/50">
        <Mic className="mx-auto h-8 w-8 text-fuchsia-400" aria-hidden />
        <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-foreground">Select a profile</p>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-zinc-600 dark:text-muted-foreground">
          Cards on the left show every trained voice. Pick one to copy <code className="font-mono">profile_id</code> into Studio.
        </p>
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-fuchsia-50 via-rose-50 to-amber-50 p-6 text-zinc-950 shadow-2xl shadow-rose-200/50 dark:border-rose-300/40 dark:from-fuchsia-950/50 dark:via-rose-950/40 dark:to-amber-950/30 dark:text-foreground dark:shadow-none">
      <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-rose-200/60 blur-3xl dark:opacity-50" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-amber-200/60 blur-3xl dark:opacity-50" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-fuchsia-600 ring-1 ring-fuchsia-200 backdrop-blur dark:bg-white/20 dark:text-fuchsia-200 dark:ring-fuchsia-400/40">
          <BadgeCheck className="h-3.5 w-3.5" />
          Voice preview
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-fuchsia-600 to-rose-500 bg-clip-text text-transparent">{profile.creator_name}</span>{" "}
          <span className="text-zinc-800 dark:text-foreground/90">in campaigns &amp; Twin.</span>
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-800 dark:text-foreground/85">{profile.summary_block}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.tone_descriptors.slice(0, 6).map((t) => (
            <span
              key={t}
              className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-fuchsia-800 ring-1 ring-fuchsia-200 backdrop-blur dark:bg-white/15 dark:text-fuchsia-100 dark:ring-fuchsia-400/30"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/twin"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-400/35"
          >
            Open Twin chat
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/studio"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-900 dark:border-border dark:bg-card dark:text-foreground"
          >
            Studio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VoicePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);

  const [activeId, setActiveId] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(LS_ACTIVE) : null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [createDrafts, setCreateDrafts] = useState<SampleDraft[]>([{ kind: "text", value: "" }]);
  const [creating, setCreating] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDrafts, setEditDrafts] = useState<SampleDraft[]>([{ kind: "text", value: "" }]);
  const [doText, setDoText] = useState("");
  const [dontText, setDontText] = useState("");
  const [savingLists, setSavingLists] = useState(false);
  const [repr, setRepr] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const list = await listVoiceProfiles();
      const sorted = [...list].sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      setProfiles(sorted);
      setSelectedId((cur) => {
        if (cur && sorted.some((x) => x.profile_id === cur)) return cur;
        return sorted[0]?.profile_id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      if (!activeId) localStorage.removeItem(LS_ACTIVE);
      else localStorage.setItem(LS_ACTIVE, activeId);
    } catch {
      /* ignore */
    }
  }, [activeId]);

  const selected = useMemo(
    () => profiles.find((p) => p.profile_id === selectedId) ?? null,
    [profiles, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setEditName("");
      setEditDrafts([{ kind: "text", value: "" }]);
      setDoText("");
      setDontText("");
      return;
    }
    setEditName(selected.creator_name);
    setEditDrafts([{ kind: "text", value: "" }]);
    setDoText(selected.do_list.join("\n"));
    setDontText(selected.dont_list.join("\n"));
  }, [selected?.profile_id, selected?.updated_at]);

  const onCreate = async () => {
    const name = newName.trim();
    const samples = draftsToSamples(createDrafts);
    if (!name) {
      setError("Enter a display name for this voice.");
      return;
    }
    if (samples.length === 0) {
      setError("Add at least one sample (text, URL, or Reddit user). The server needs writing to learn from.");
      return;
    }
    setCreating(true);
    try {
      setError(undefined);
      const created = await createVoiceProfile({ creator_name: name, samples });
      setNewName("");
      setCreateDrafts([{ kind: "text", value: "" }]);
      await refresh();
      setSelectedId(created.profile_id);
      setActiveId(created.profile_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const onReprofile = async () => {
    if (!selected) return;
    const samples = draftsToSamples(editDrafts);
    if (samples.length === 0) {
      setError("Add at least one new sample before Update & re-profile.");
      return;
    }
    setRepr(true);
    try {
      setError(undefined);
      await updateVoiceProfile(selected.profile_id, {
        creator_name: editName.trim() || selected.creator_name,
        samples,
      });
      setEditDrafts([{ kind: "text", value: "" }]);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRepr(false);
    }
  };

  const onSaveLists = async () => {
    if (!selected) return;
    setSavingLists(true);
    try {
      setError(undefined);
      const do_list = doText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const dont_list = dontText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await patchVoiceLists(selected.profile_id, { do_list, dont_list });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingLists(false);
    }
  };

  return (
    <div className="relative min-h-full overflow-hidden bg-[#fdf7ee] text-foreground dark:bg-background">
      <div className="pointer-events-none fixed inset-0 -z-20 dark:opacity-50">
        <div className="absolute -top-32 left-[-10%] h-[480px] w-[480px] rounded-full bg-violet-300/35 blur-[140px]" />
        <div className="absolute top-10 right-[-8%] h-[520px] w-[520px] rounded-full bg-amber-300/40 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[15%] h-[420px] w-[420px] rounded-full bg-emerald-300/30 blur-[140px]" />
        <div className="absolute bottom-[5%] right-[10%] h-[480px] w-[480px] rounded-full bg-fuchsia-300/35 blur-[150px]" />
      </div>

      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white shadow-md shadow-rose-300/40">
            <Sparkles className="h-4 w-4" />
          </span>
          Launchy{" "}
          <span className="bg-gradient-to-r from-emerald-600 to-sky-500 bg-clip-text text-transparent">Voice</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ThemeToggle />
          <Link
            to="/"
            className="hidden h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white sm:inline-flex dark:border-border dark:bg-card dark:text-foreground"
          >
            Home
          </Link>
          <Link
            to="/campaigns"
            className="hidden h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white sm:inline-flex dark:border-border dark:bg-card dark:text-foreground"
          >
            Campaigns
          </Link>
          <Link
            to="/twin"
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-border dark:bg-card dark:text-foreground"
          >
            Twin
          </Link>
          <Link
            to="/studio"
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-border dark:bg-card dark:text-foreground"
          >
            Studio
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/75 px-6 py-14 shadow-2xl shadow-rose-200/30 backdrop-blur md:px-10 dark:border-border dark:bg-card/80 dark:shadow-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(20,20,20,0.06)_1px,transparent_0)] [background-size:26px_26px] dark:opacity-30" />
          <div className="pointer-events-none absolute -top-24 -left-12 h-72 w-72 rounded-full bg-emerald-300/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-fuchsia-300/35 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center text-zinc-950 dark:text-foreground">
            <StaggerReveal stagger={0.06} delayChildren={0.04} amount={0.1}>
              <StaggerItem>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Stars className="h-3.5 w-3.5" />
                  Train your Twin
                </div>
              </StaggerItem>
              <StaggerItem>
                <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.04em] text-zinc-950 md:text-5xl lg:text-6xl dark:text-foreground">
                  Brand voice that carries into{" "}
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-fuchsia-500 via-rose-400 to-orange-400 bg-clip-text italic text-transparent">
                      every draft.
                    </span>
                    <svg
                      aria-hidden
                      className="absolute -bottom-2 left-0 w-full"
                      viewBox="0 0 120 8"
                      fill="none"
                      preserveAspectRatio="none"
                      height={8}
                    >
                      <path d="M2 5 C 40 0, 80 0, 118 5" stroke="url(#gv)" strokeWidth="3" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="gv" x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#d946ef" />
                          <stop offset="100%" stopColor="#fb923c" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-700 dark:text-muted-foreground">
                  Paste writing you actually shipped. Launchy extracts tone, vocabulary, and DO/DON&apos;T lines — then{" "}
                  <Link to="/twin" className="font-semibold text-fuchsia-700 underline-offset-4 hover:underline dark:text-fuchsia-400">
                    Twin
                  </Link>
                  , campaigns, and Studio&apos;s <strong className="text-zinc-900 dark:text-foreground">Brand voice</strong> block stay aligned.
                </p>
              </StaggerItem>
            </StaggerReveal>
          </div>
        </section>

        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 px-4 py-10 shadow-xl shadow-black/5 backdrop-blur dark:border-border dark:bg-card/70">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:48px_48px] dark:opacity-20" />
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-600 dark:text-fuchsia-400">Feeds the same research stack</p>
            <p className="mt-2 text-sm text-zinc-700 dark:text-muted-foreground">
              Voice profiles pair with community signals when you run campaigns or workflows.
            </p>
            <StaggerReveal className="mt-6 flex flex-wrap justify-center gap-3" stagger={0.035} amount={0.08}>
              {VOICE_LOGO_ROW.map((b) => (
                <StaggerItem key={b.label}>
                  <IntegrationPill {...b} />
                </StaggerItem>
              ))}
            </StaggerReveal>
          </div>
        </section>

        <div className="mt-4 rounded-[1.25rem] border border-fuchsia-200/50 bg-white/80 p-4 shadow-inner dark:border-border dark:bg-card/60">
          <LaunchyFlowExplainer variant="compact" className="max-w-none border-0 bg-transparent shadow-none dark:bg-transparent" />
          <p className="mt-3 text-center text-xs leading-relaxed text-zinc-600 dark:text-muted-foreground">
            In Studio, add a <strong className="font-medium text-zinc-900 dark:text-foreground">Brand voice</strong> node and paste{" "}
            <code className="rounded bg-fuchsia-100/80 px-1 py-0.5 font-mono text-[11px] dark:bg-muted">profile_id</code> from a card below — or use
            the active profile prefill on new blocks.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-300/60 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-md dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-100">
            <div className="font-semibold">Something went wrong</div>
            <div className="mt-2 whitespace-pre-wrap break-words text-xs opacity-95">{error}</div>
            <button type="button" className="mt-3 text-xs font-semibold underline" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <ScrollReveal direction="right" distance={28} duration={0.5} amount={0.12} className="min-h-0 space-y-6">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white p-7 text-zinc-950 shadow-xl dark:border-border dark:bg-card dark:text-foreground">
              <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-fuchsia-200/50 blur-3xl dark:opacity-40" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Your{" "}
                      <span className="bg-gradient-to-r from-fuchsia-500 to-orange-400 bg-clip-text text-transparent">profiles</span>
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-muted-foreground">
                      Set one as <strong className="text-zinc-950 dark:text-foreground">Active</strong> — Twin picks it by default; workflows can still override per node.
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-500/40">
                    {loading ? "…" : `${profiles.length} saved`}
                  </span>
                </div>

                <div className="mt-6">
                  {loading ? (
                    <p className="text-sm text-zinc-600 dark:text-muted-foreground">Loading…</p>
                  ) : profiles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-fuchsia-300/60 bg-fuchsia-50/40 p-8 text-center dark:border-fuchsia-500/30 dark:bg-fuchsia-950/20">
                      <Wand2 className="mx-auto h-7 w-7 text-fuchsia-500" aria-hidden />
                      <p className="mt-3 text-sm font-semibold text-zinc-950 dark:text-foreground">No voice profiles yet</p>
                      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-700 dark:text-muted-foreground">
                        Use the form below — real posts beat generic adjectives every time.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {profiles.map((p) => (
                        <ProfileCard
                          key={p.profile_id}
                          p={p}
                          selected={selectedId === p.profile_id}
                          active={activeId === p.profile_id}
                          onSelect={() => setSelectedId(p.profile_id)}
                          onSetActive={() => setActiveId(p.profile_id)}
                          onDelete={async () => {
                            if (!window.confirm(`Delete voice profile “${p.creator_name}”?`)) return;
                            try {
                              await deleteVoiceProfile(p.profile_id);
                              if (activeId === p.profile_id) setActiveId(null);
                              await refresh();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : String(e));
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white p-7 shadow-xl dark:border-border dark:bg-card">
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-emerald-200/50 blur-3xl dark:opacity-40" />
              <div className="relative space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-950 dark:text-foreground">Create a new profile</h2>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-muted-foreground">At least one sample — Launchy reads it once and extracts tone rules.</p>
                </div>
                <label className="grid gap-2 text-sm font-medium text-zinc-950 dark:text-foreground">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" /> Display name
                  </span>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. My creator brand"
                    className="border-fuchsia-200 bg-white text-zinc-950 dark:border-border dark:bg-background dark:text-foreground"
                  />
                </label>
                <SampleEditor drafts={createDrafts} onChange={setCreateDrafts} />
                <Button
                  type="button"
                  onClick={() => void onCreate()}
                  disabled={creating}
                  className="rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 px-6 text-white shadow-lg shadow-rose-400/35 hover:opacity-95 disabled:opacity-60"
                >
                  {creating ? "Creating…" : "Create & learn voice"}
                  {!creating ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                </Button>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left" distance={28} delay={0.06} duration={0.5} amount={0.12} className="min-h-0 space-y-5">
            <VoicePreviewCard profile={selected} />
            <StaggerReveal className="grid gap-3" stagger={0.07} amount={0.1}>
              {[
                { copy: "Paste captions you’ve already posted — not how you wish you sounded.", tone: "bg-amber-100 text-amber-800 ring-amber-300", dot: "bg-amber-500" },
                { copy: "URLs and Reddit usernames give extra texture for the profiler.", tone: "bg-violet-100 text-violet-800 ring-violet-300", dot: "bg-violet-500" },
                { copy: "Set Active so Twin and new Brand voice blocks pick it up automatically.", tone: "bg-emerald-100 text-emerald-800 ring-emerald-300", dot: "bg-emerald-500" },
              ].map(({ copy, tone, dot }) => (
                <StaggerItem key={copy}>
                  <div className="flex items-start gap-3 rounded-3xl border border-white/80 bg-white px-5 py-4 text-sm font-semibold shadow-sm dark:border-border dark:bg-card">
                    <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone} ring-1`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    </span>
                    <span className="text-zinc-900 dark:text-foreground">{copy}</span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerReveal>
          </ScrollReveal>
        </section>

        {selected ? (
          <section
            id="voice-edit"
            className="relative mt-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white p-7 shadow-xl dark:border-border dark:bg-card"
          >
            <div className="pointer-events-none absolute -top-16 right-10 h-52 w-52 rounded-full bg-sky-200/50 blur-3xl dark:opacity-40" />
            <div className="relative space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-950 dark:text-foreground">Edit · {selected.creator_name}</h2>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-muted-foreground">
                    Re-profile after new samples, or tweak DO/DON&apos;T without re-running the model.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => void navigator.clipboard.writeText(selected.profile_id)}
                >
                  Copy profile_id
                </Button>
              </div>

              <div className="space-y-3 border-t border-zinc-200/80 pt-6 dark:border-border">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-muted-foreground">New samples → re-learn</h3>
                <label className="grid gap-2 text-sm font-medium text-zinc-950 dark:text-foreground">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Name (optional change)
                  </span>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border-rose-200 bg-white dark:border-border dark:bg-background"
                  />
                </label>
                <SampleEditor drafts={editDrafts} onChange={setEditDrafts} />
                <Button type="button" variant="secondary" className="rounded-full" disabled={repr} onClick={() => void onReprofile()}>
                  {repr ? "Re-profiling…" : "Update & re-profile"}
                </Button>
              </div>

              <div className="space-y-3 border-t border-zinc-200/80 pt-6 dark:border-border">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-muted-foreground">Manual DO / DON&apos;T</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-zinc-700 dark:text-muted-foreground">DO (one line each)</span>
                    <Textarea
                      className="min-h-[120px] border-emerald-200 bg-white font-mono text-xs dark:border-border dark:bg-background"
                      value={doText}
                      onChange={(e) => setDoText(e.target.value)}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-zinc-700 dark:text-muted-foreground">DON&apos;T</span>
                    <Textarea
                      className="min-h-[120px] border-rose-200 bg-white font-mono text-xs dark:border-border dark:bg-background"
                      value={dontText}
                      onChange={(e) => setDontText(e.target.value)}
                    />
                  </label>
                </div>
                <Button type="button" size="sm" className="rounded-full" disabled={savingLists} onClick={() => void onSaveLists()}>
                  {savingLists ? "Saving…" : "Save DO / DON'T only"}
                </Button>
              </div>

              <details className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 text-xs dark:border-border dark:bg-muted/30">
                <summary className="cursor-pointer font-semibold text-zinc-950 dark:text-foreground">Full profile JSON</summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-zinc-600 dark:text-muted-foreground">
                  {JSON.stringify(selected, null, 2)}
                </pre>
              </details>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

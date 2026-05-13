import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileAudio,
  Loader2,
  Mic,
  Quote,
  Sparkles,
  Stars,
  Trash2,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import { IntegrationPill } from "@/components/marketing/IntegrationPill";
import { useLocalStorageDialogs } from "@/components/creator/LocalStorageDialogs";
import { LaunchyFlowExplainer } from "@/components/LaunchyFlowExplainer";
import { ScrollReveal, StaggerItem, StaggerReveal } from "@/components/motion/ScrollReveal";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createVoiceProfileStream,
  deleteVoiceProfile,
  listVoiceProfiles,
  patchVoiceLists,
  updateVoiceProfile,
  type ReelTranscription,
  type VoiceProfile,
  type VoiceStreamEvent,
  type VoiceSampleRow,
} from "@/lib/api";
import { MARKETING_INTEGRATIONS } from "@/lib/integrationBrands";
import { cn } from "@/lib/utils";

const LS_ACTIVE = "launchy_active_voice_profile";
const VOICE_LOGO_ROW = MARKETING_INTEGRATIONS.slice(0, 8);

/** UI row; backend: `text` | `url` | `reddit_user` | `instagram_profile`. */
type SampleDraft = { kind: "text" | "url" | "reddit_user" | "instagram_profile"; value: string };

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
    if (k === "reddit_user") return "reddit username (without u/)";
    return "https://www.instagram.com/yourhandle/ — we pull public reels + transcribe audio";
  };

  return (
    <div className="space-y-3">
      {drafts.map((d, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-3xl border border-white/80 bg-white/60 p-3 shadow-sm ring-1 ring-black/[0.04] sm:flex-row sm:items-start"
        >
          <select
            className="h-10 shrink-0 rounded-xl border border-violet-200 bg-white px-2 text-xs font-semibold text-zinc-900 dark:border-border dark:bg-white dark:text-zinc-950"
            value={d.kind}
            onChange={(e) => updateAt(i, { kind: e.target.value as SampleDraft["kind"] })}
          >
            <option value="text">Paste text</option>
            <option value="url">Web URL</option>
            <option value="reddit_user">Reddit user</option>
            <option value="instagram_profile">Instagram profile</option>
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
        "relative w-full overflow-hidden rounded-[2.25rem] border p-4 text-left shadow-md ring-1 transition hover:-translate-y-0.5 hover:shadow-lg " +
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

function VoicePreviewCard({
  profile,
  twinTabLink,
}: {
  profile: VoiceProfile | null;
  /** e.g. /twin?tab=chat when embedded in Digital Twin page */
  twinTabLink?: string;
}) {
  const [transOpen, setTransOpen] = useState(false);
  if (!profile) {
    return (
      <div className="relative overflow-hidden rounded-[3rem] border border-dashed border-fuchsia-200/80 bg-white/60 p-8 text-center shadow-inner dark:border-border dark:bg-card/50">
        <Mic className="mx-auto h-8 w-8 text-fuchsia-400" aria-hidden />
        <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-foreground">Select a profile</p>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-zinc-600 dark:text-muted-foreground">
          Cards on the left show every trained voice. Pick one to see its full analysis.
        </p>
      </div>
    );
  }
  const trans = profile.transcriptions ?? [];
  return (
    <div className="relative overflow-hidden rounded-[3rem] border border-white/70 bg-gradient-to-br from-fuchsia-50/80 via-rose-50/60 to-amber-50/60 p-6 text-zinc-950 shadow-xl shadow-rose-200/30 dark:border-rose-300/30 dark:from-fuchsia-950/40 dark:via-rose-950/30 dark:to-amber-950/20 dark:text-foreground dark:shadow-none">
      <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-rose-200/50 blur-3xl dark:opacity-40" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-amber-200/50 blur-3xl dark:opacity-40" />
      <div className="relative space-y-5">

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-fuchsia-600 ring-1 ring-fuchsia-200 backdrop-blur dark:bg-white/15 dark:text-fuchsia-200 dark:ring-fuchsia-400/40">
            <BadgeCheck className="h-3.5 w-3.5" />
            Voice profile
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-fuchsia-600 to-rose-500 bg-clip-text text-transparent">{profile.creator_name}</span>
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.tone_descriptors.map((t) => (
              <span key={t} className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-fuchsia-800 ring-1 ring-fuchsia-200 backdrop-blur dark:bg-white/15 dark:text-fuchsia-100 dark:ring-fuchsia-400/30">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Vocabulary */}
        <div className="rounded-2xl border border-amber-100/80 bg-white/70 px-4 py-3 dark:border-border dark:bg-card/50">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Signature vocabulary</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.vocabulary_signature.map((w) => (
              <span key={w} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:ring-amber-500/30">
                {w}
              </span>
            ))}
          </div>
        </div>

        {/* How they write */}
        <div className="rounded-2xl border border-sky-100/80 bg-white/70 px-4 py-3 dark:border-border dark:bg-card/50">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">How they write</p>
          <p className="text-xs leading-relaxed text-zinc-800 dark:text-foreground/90">{profile.sentence_style}</p>
        </div>

        {/* Delivery */}
        {profile.delivery_style ? (
          <div className="rounded-2xl border border-violet-100/80 bg-white/70 px-4 py-3 dark:border-border dark:bg-card/50">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">On-camera delivery</p>
            <p className="text-xs leading-relaxed text-zinc-800 dark:text-foreground/90">{profile.delivery_style}</p>
          </div>
        ) : null}

        {/* DO / DON'T */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100/80 bg-white/70 px-4 py-3 dark:border-border dark:bg-card/50">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Always do</p>
            <ul className="space-y-1.5">
              {profile.do_list.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-800 dark:text-foreground/85">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-rose-100/80 bg-white/70 px-4 py-3 dark:border-border dark:bg-card/50">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">Never do</p>
            <ul className="space-y-1.5">
              {profile.dont_list.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-800 dark:text-foreground/85">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Example hooks */}
        {profile.example_hooks.length > 0 ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-muted-foreground">Example hooks from their content</p>
            <div className="space-y-2">
              {profile.example_hooks.map((h, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-zinc-100 bg-white/80 px-3 py-2.5 dark:border-border dark:bg-card/60">
                  <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fuchsia-400" />
                  <p className="text-xs italic text-zinc-800 dark:text-foreground/90">{h}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Transcriptions toggle */}
        {trans.length > 0 ? (
          <div>
            <button
              type="button"
              onClick={() => setTransOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300"
            >
              {transOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {trans.length} reel{trans.length !== 1 ? "s" : ""} transcribed
            </button>
            {transOpen ? (
              <div className="mt-2 space-y-2">
                {trans.map((t) => (
                  <TranscriptionCard key={t.shortcode} t={t} index={t.reel_index} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* CTAs */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to={twinTabLink ?? "/twin?tab=chat"}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-400/35"
          >
            Chat with Twin
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/studio"
            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-900 dark:border-border dark:bg-card dark:text-foreground"
          >
            Studio
          </Link>
        </div>
      </div>
    </div>
  );
}

type StreamStep = { step: string; msg: string; done: boolean };

function TranscriptionCard({
  t,
  index,
}: {
  t: ReelTranscription;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const hasTranscript = t.transcript && !t.transcript.startsWith("[");
  return (
    <div className="rounded-2xl border border-violet-100 bg-white/80 shadow-sm dark:border-border dark:bg-card/70">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-200">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-medium text-zinc-900 dark:text-foreground">
            {t.caption || <span className="italic text-zinc-400">(no caption)</span>}
          </p>
          {hasTranscript ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-violet-600 dark:text-violet-300">
              <FileAudio className="mr-0.5 inline h-3 w-3" />
              Transcript available
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-zinc-400">No audio transcript</p>
          )}
        </div>
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t border-violet-100 px-4 pb-4 pt-3 dark:border-border">
          {t.caption ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-muted-foreground">Caption</p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-800 dark:text-foreground/90">{t.caption}</p>
            </div>
          ) : null}
          {t.transcript ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                Spoken transcript
              </p>
              <p className={cn("whitespace-pre-wrap text-xs leading-relaxed", hasTranscript ? "text-zinc-800 dark:text-foreground/90" : "italic text-zinc-400")}>
                {t.transcript}
              </p>
            </div>
          ) : null}
          {t.url ? (
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400"
            >
              View reel ↗
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProfileResultView({
  profile,
  onClose,
}: {
  profile: VoiceProfile;
  onClose: () => void;
}) {
  const trans = profile.transcriptions ?? [];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-500/40">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Voice profile created
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-foreground">
          {profile.creator_name}
        </h2>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {profile.tone_descriptors.map((t) => (
            <span
              key={t}
              className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-800 ring-1 ring-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-100 dark:ring-fuchsia-400/30"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Vocabulary */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-4 dark:border-border dark:bg-amber-950/20">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Signature vocabulary</p>
        <div className="flex flex-wrap gap-2">
          {profile.vocabulary_signature.map((w) => (
            <span key={w} className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-500/30">
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* Sentence style */}
      <div className="rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-4 dark:border-border dark:bg-sky-950/20">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">How they write</p>
        <p className="text-sm leading-relaxed text-zinc-800 dark:text-foreground/90">{profile.sentence_style}</p>
      </div>

      {/* Delivery */}
      {profile.delivery_style ? (
        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-4 dark:border-border dark:bg-violet-950/20">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">On-camera delivery</p>
          <p className="text-sm leading-relaxed text-zinc-800 dark:text-foreground/90">{profile.delivery_style}</p>
        </div>
      ) : null}

      {/* DO / DON'T */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-4 dark:border-border dark:bg-emerald-950/20">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Always do</p>
          <ul className="space-y-2">
            {profile.do_list.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-800 dark:text-foreground/90">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-4 dark:border-border dark:bg-rose-950/20">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">Never do</p>
          <ul className="space-y-2">
            {profile.dont_list.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-800 dark:text-foreground/90">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Example hooks */}
      {profile.example_hooks.length > 0 ? (
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-muted-foreground">Example hooks from their content</p>
          <div className="space-y-2">
            {profile.example_hooks.map((h, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border border-zinc-100 bg-white/80 px-4 py-3 dark:border-border dark:bg-card/70">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-400" />
                <p className="text-sm italic text-zinc-800 dark:text-foreground/90">{h}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Transcriptions */}
      {trans.length > 0 ? (
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
            Research: {trans.length} reel{trans.length !== 1 ? "s" : ""} transcribed
          </p>
          <div className="space-y-2">
            {trans.map((t) => (
              <TranscriptionCard key={t.shortcode} t={t} index={t.reel_index} />
            ))}
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={onClose}
        className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 text-white shadow-lg shadow-rose-400/35 hover:opacity-95"
      >
        View in Voice Studio
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function ProfileCreationOverlay({
  creatorName,
  steps,
  liveTranscriptions,
  doneProfile,
  error,
  onClose,
}: {
  creatorName: string;
  steps: StreamStep[];
  liveTranscriptions: ReelTranscription[];
  doneProfile: VoiceProfile | null;
  error: string | null;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps.length, liveTranscriptions.length]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={scrollRef}
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-y-auto overscroll-contain rounded-[2.5rem] border border-white/70 bg-[#fdf7ee] shadow-2xl dark:border-border dark:bg-background"
      >
        {/* Blobs */}
        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-fuchsia-300/40 blur-3xl dark:opacity-40" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-300/35 blur-3xl dark:opacity-35" />

        <div className="relative px-6 pb-8 pt-7 sm:px-8">
          {doneProfile ? (
            <ProfileResultView profile={doneProfile} onClose={onClose} />
          ) : error ? (
            <div className="space-y-4 text-center">
              <p className="text-sm font-semibold text-rose-600">Something went wrong</p>
              <p className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-muted-foreground">{error}</p>
              <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-orange-400 shadow-md shadow-rose-300/40">
                  <Sparkles className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-300">Building voice profile</p>
                  <p className="text-base font-semibold text-zinc-950 dark:text-foreground">{creatorName}</p>
                </div>
              </div>

              {/* Live step list */}
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {s.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : i === steps.length - 1 ? (
                      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-fuchsia-500" />
                    ) : (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-zinc-300 dark:bg-muted-foreground/40" />
                    )}
                    <p className={cn("text-sm", s.done ? "text-zinc-500 dark:text-muted-foreground" : "font-medium text-zinc-950 dark:text-foreground")}>
                      {s.msg}
                    </p>
                  </div>
                ))}
              </div>

              {/* Live transcription cards */}
              {liveTranscriptions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                    Reels transcribed so far
                  </p>
                  {liveTranscriptions.map((t) => (
                    <TranscriptionCard key={t.shortcode} t={t} index={t.reel_index} />
                  ))}
                </div>
              ) : null}

              {/* Subtle "hang tight" note */}
              {!doneProfile && !error && (
                <p className="text-center text-xs text-zinc-400 dark:text-muted-foreground/60">
                  Instagram + transcription can take 1–2 min. Hang tight ☕
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function VoiceStudioView({
  embedded = false,
  twinTabLink,
}: {
  embedded?: boolean;
  /** Override link target for the Open Twin chat CTA */
  twinTabLink?: string;
}) {
  const { confirmAction } = useLocalStorageDialogs();
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

  // Streaming overlay state
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlaySteps, setOverlaySteps] = useState<StreamStep[]>([]);
  const [overlayTranscriptions, setOverlayTranscriptions] = useState<ReelTranscription[]>([]);
  const [overlayDoneProfile, setOverlayDoneProfile] = useState<VoiceProfile | null>(null);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [overlayCreatorName, setOverlayCreatorName] = useState("");

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
      setError("Add at least one sample (text, URL, Reddit user, or Instagram profile). Instagram training can take a minute while reels are fetched and transcribed.");
      return;
    }

    // Reset and open overlay
    setOverlayCreatorName(name);
    setOverlaySteps([]);
    setOverlayTranscriptions([]);
    setOverlayDoneProfile(null);
    setOverlayError(null);
    setOverlayOpen(true);
    setCreating(true);
    setError(undefined);

    const pushStep = (msg: string, step: string) => {
      setOverlaySteps((prev) => {
        // mark previous step done, add new one
        const updated = prev.map((s) => ({ ...s, done: true }));
        return [...updated, { step, msg, done: false }];
      });
    };

    try {
      const created = await createVoiceProfileStream(
        { creator_name: name, samples },
        (evt: VoiceStreamEvent) => {
          if (evt.type === "step") {
            pushStep(evt.msg, evt.step);
          } else if (evt.type === "transcription") {
            setOverlayTranscriptions((prev) => [
              ...prev,
              {
                reel_index: evt.reel_index,
                shortcode: evt.shortcode,
                url: evt.url,
                caption: evt.caption,
                transcript: evt.transcript,
              },
            ]);
          }
        },
      );
      // Mark all steps done
      setOverlaySteps((prev) => prev.map((s) => ({ ...s, done: true })));
      setOverlayDoneProfile(created);
      setNewName("");
      setCreateDrafts([{ kind: "text", value: "" }]);
      await refresh();
      setSelectedId(created.profile_id);
      setActiveId(created.profile_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOverlayError(msg);
      setError(msg);
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
    <>
    {overlayOpen ? (
      <ProfileCreationOverlay
        creatorName={overlayCreatorName}
        steps={overlaySteps}
        liveTranscriptions={overlayTranscriptions}
        doneProfile={overlayDoneProfile}
        error={overlayError}
        onClose={() => setOverlayOpen(false)}
      />
    ) : null}
    <div
      className={cn(
        "relative overflow-hidden text-foreground dark:bg-background",
        embedded
          ? "rounded-[3rem] border border-white/70 bg-[#fdf7ee] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] dark:border-border dark:bg-background dark:shadow-none"
          : "min-h-full bg-[#fdf7ee] dark:bg-background",
      )}
    >
      <div className="pointer-events-none fixed inset-0 -z-20 dark:opacity-50">
        <div className="absolute -top-32 left-[-10%] h-[480px] w-[480px] rounded-full bg-violet-300/35 blur-[140px]" />
        <div className="absolute top-10 right-[-8%] h-[520px] w-[520px] rounded-full bg-amber-300/40 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[15%] h-[420px] w-[420px] rounded-full bg-emerald-300/30 blur-[140px]" />
        <div className="absolute bottom-[5%] right-[10%] h-[480px] w-[480px] rounded-full bg-fuchsia-300/35 blur-[150px]" />
      </div>

      {!embedded ? (
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
            Digital Twin
          </Link>
          <Link
            to="/studio"
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-border dark:bg-card dark:text-foreground"
          >
            Studio
          </Link>
        </div>
      </header>
      ) : null}

      <main
        className={cn(
          "relative z-10 mx-auto flex max-w-7xl flex-col gap-10 pb-24 md:gap-12",
          embedded ? "px-3 pt-7 sm:px-5 sm:pt-8" : "px-4",
        )}
      >
        {embedded ? (
          <section className="relative overflow-hidden rounded-[3rem] border border-emerald-200/35 bg-gradient-to-br from-white/95 via-emerald-50/35 to-fuchsia-50/35 px-6 py-8 shadow-xl shadow-emerald-200/20 backdrop-blur-md dark:border-border dark:from-card/90 dark:via-emerald-950/20 dark:to-fuchsia-950/15 dark:shadow-none">
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-300/40 blur-3xl dark:opacity-40" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-fuchsia-300/35 blur-3xl dark:opacity-35" />
            
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Train your voice</p>
              <h2 className="font-display mt-3 text-balance text-2xl font-semibold italic tracking-tight text-zinc-950 dark:text-foreground md:text-[1.65rem]">
                Paste posts, drop a link, or add your{" "}
                <span className="bg-gradient-to-r from-fuchsia-600 to-violet-600 bg-clip-text not-italic text-transparent">Instagram profile</span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-muted-foreground">
                We fetch public reels, transcribe{" "}
                <span className="font-medium text-zinc-900 dark:text-foreground">with our models</span>, then merge captions with how you sound — ready for{" "}
                <span className="font-medium text-zinc-900 dark:text-foreground">Twin chat</span> and campaigns.
              </p>

            </div>
          </section>
        ) : (
          <>
        <section className="relative overflow-hidden rounded-[3rem] border border-white/70 bg-white/75 px-6 py-12 shadow-2xl shadow-rose-200/30 backdrop-blur md:px-10 dark:border-border dark:bg-card/80 dark:shadow-none">
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
                  <Link to="/twin?tab=chat" className="font-semibold text-fuchsia-700 underline-offset-4 hover:underline dark:text-fuchsia-400">
                    Twin
                  </Link>
                  , campaigns, and Studio&apos;s <strong className="text-zinc-900 dark:text-foreground">Brand voice</strong> block stay aligned.
                </p>
              </StaggerItem>
            </StaggerReveal>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[3rem] border border-white/70 bg-white/70 px-5 py-11 shadow-xl shadow-black/5 backdrop-blur dark:border-border dark:bg-card/70">
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
          </>
        )}

        <section className="relative overflow-hidden rounded-[3rem] border border-violet-200/40 bg-gradient-to-br from-white/95 via-violet-50/35 to-amber-50/25 px-5 py-7 shadow-lg shadow-violet-200/20 sm:px-7 sm:py-8 dark:border-border dark:from-card dark:via-violet-950/20 dark:to-card">
          <LaunchyFlowExplainer
            variant="compact"
            className="max-w-none rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
          />
          <p className="mx-auto mt-8 max-w-xl text-center text-[11px] leading-relaxed text-zinc-500 dark:text-muted-foreground">
              In Studio, add a <strong className="font-medium text-zinc-800 dark:text-foreground">Brand voice</strong> node and paste{" "}
              <code className="rounded-md bg-fuchsia-100/90 px-1.5 py-0.5 font-mono dark:bg-muted">profile_id</code> from a card below — or use the{" "}
            <strong className="font-medium text-zinc-800 dark:text-foreground">active profile</strong> prefill on new blocks.
          </p>
        </section>

        {error ? (
          <div className="rounded-[2.25rem] border border-rose-300/60 bg-rose-50/90 p-5 text-sm text-rose-900 shadow-md dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-100">
            <div className="font-semibold">Something went wrong</div>
            <div className="mt-2 whitespace-pre-wrap break-words text-xs opacity-95">{error}</div>
            <button type="button" className="mt-3 text-xs font-semibold underline" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <ScrollReveal direction="right" distance={28} duration={0.5} amount={0.12} className="min-h-0 space-y-8">
            <div className="relative overflow-hidden rounded-[3rem] border border-white/70 bg-white p-7 text-zinc-950 shadow-xl dark:border-border dark:bg-card dark:text-foreground sm:p-8">
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
                    <div className="rounded-[2.25rem] border border-dashed border-fuchsia-300/60 bg-fuchsia-50/40 p-8 text-center dark:border-fuchsia-500/30 dark:bg-fuchsia-950/20">
                      <Wand2 className="mx-auto h-7 w-7 text-fuchsia-500" aria-hidden />
                      <p className="mt-3 text-sm font-semibold text-zinc-950 dark:text-foreground">No voice profiles yet</p>
                      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-700 dark:text-muted-foreground">
                        Use the form below — real posts beat generic adjectives every time.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                      {profiles.map((p) => (
                        <ProfileCard
                          key={p.profile_id}
                          p={p}
                          selected={selectedId === p.profile_id}
                          active={activeId === p.profile_id}
                          onSelect={() => setSelectedId(p.profile_id)}
                          onSetActive={() => setActiveId(p.profile_id)}
                          onDelete={async () => {
                            const ok = await confirmAction({
                              title: `Delete voice profile “${p.creator_name}”?`,
                              description:
                                "This removes the saved voice from Launchy. Twin and workflows will stop using it unless you add another profile.",
                              tone: "danger",
                              confirmLabel: "Delete profile",
                              cancelLabel: "Keep it",
                            });
                            if (!ok) return;
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

            <div className="relative overflow-hidden rounded-[3rem] border border-white/70 bg-white p-7 shadow-xl dark:border-border dark:bg-card sm:p-8">
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
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analysing…
                    </>
                  ) : (
                    <>
                      Create & learn voice
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left" distance={28} delay={0.06} duration={0.5} amount={0.12} className="min-h-0 space-y-8">
            <VoicePreviewCard profile={selected} twinTabLink={twinTabLink} />

          </ScrollReveal>
        </section>

        {selected ? (
          <section
            id="voice-edit"
            className="relative overflow-hidden rounded-[3rem] border border-white/70 bg-white p-7 shadow-xl dark:border-border dark:bg-card sm:p-8"
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

              <details className="rounded-[2rem] border border-zinc-200/80 bg-zinc-50/50 p-4 text-xs dark:border-border dark:bg-muted/30">
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
    </>
  );
}

export default VoiceStudioView;

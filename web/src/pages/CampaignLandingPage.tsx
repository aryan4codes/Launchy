/**
 * Visual / layout inspiration (shared with root landing):
 * https://dribbble.com/shots/25000009-ChronoTask-Landing-Page
 * Vibrant creator persona builder — color-tinted chips, gradient hero,
 * brand-tinted source pills.
 */
import {
  ArrowRight,
  BadgeCheck,
  Flame,
  Heart,
  Instagram,
  PenLine,
  Sparkles,
  Stars,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { IntegrationPill } from "@/components/marketing/IntegrationPill";
import { ScrollReveal, StaggerItem, StaggerReveal } from "@/components/motion/ScrollReveal";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MARKETING_INTEGRATIONS } from "@/lib/integrationBrands";

const CAMPAIGN_LOGO_ROW_1 = MARKETING_INTEGRATIONS.slice(0, 6);
const CAMPAIGN_LOGO_ROW_2 = MARKETING_INTEGRATIONS.slice(6, 12);
const CAMPAIGN_INTEGRATIONS_ALL = [...CAMPAIGN_LOGO_ROW_1, ...CAMPAIGN_LOGO_ROW_2];

type ChipColor = {
  active: string;
  idle: string;
  dot: string;
};

const TONE_TRAITS: { label: string; color: ChipColor }[] = [
  { label: "educational", color: { active: "bg-sky-100 text-sky-700 ring-sky-300",        idle: "hover:bg-sky-50",        dot: "bg-sky-500" } },
  { label: "sharp",       color: { active: "bg-rose-100 text-rose-700 ring-rose-300",     idle: "hover:bg-rose-50",       dot: "bg-rose-500" } },
  { label: "funny",       color: { active: "bg-amber-100 text-amber-800 ring-amber-300",  idle: "hover:bg-amber-50",      dot: "bg-amber-500" } },
  { label: "premium",     color: { active: "bg-violet-100 text-violet-700 ring-violet-300", idle: "hover:bg-violet-50",   dot: "bg-violet-500" } },
  { label: "calm",        color: { active: "bg-emerald-100 text-emerald-700 ring-emerald-300", idle: "hover:bg-emerald-50", dot: "bg-emerald-500" } },
  { label: "cinematic",   color: { active: "bg-indigo-100 text-indigo-700 ring-indigo-300", idle: "hover:bg-indigo-50",   dot: "bg-indigo-500" } },
  { label: "sarcastic",   color: { active: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-300", idle: "hover:bg-fuchsia-50", dot: "bg-fuchsia-500" } },
  { label: "warm",        color: { active: "bg-orange-100 text-orange-700 ring-orange-300", idle: "hover:bg-orange-50",   dot: "bg-orange-500" } },
];

const FORMATS: { label: string; color: ChipColor }[] = [
  { label: "TikTok scripts",       color: { active: "bg-cyan-100 text-cyan-700 ring-cyan-300",         idle: "hover:bg-cyan-50",       dot: "bg-cyan-500" } },
  { label: "Instagram carousels",  color: { active: "bg-pink-100 text-pink-700 ring-pink-300",         idle: "hover:bg-pink-50",       dot: "bg-pink-500" } },
  { label: "LinkedIn posts",       color: { active: "bg-blue-100 text-blue-700 ring-blue-300",         idle: "hover:bg-blue-50",       dot: "bg-blue-500" } },
  { label: "X threads",            color: { active: "bg-zinc-200 text-zinc-800 ring-zinc-400",         idle: "hover:bg-zinc-100",      dot: "bg-zinc-800" } },
  { label: "short captions",       color: { active: "bg-emerald-100 text-emerald-700 ring-emerald-300", idle: "hover:bg-emerald-50",   dot: "bg-emerald-500" } },
  { label: "visual prompts",       color: { active: "bg-violet-100 text-violet-700 ring-violet-300",   idle: "hover:bg-violet-50",     dot: "bg-violet-500" } },
];

function Chip({
  children,
  selected,
  color,
  onClick,
}: {
  children: string;
  selected?: boolean;
  color: ChipColor;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        selected
          ? `${color.active} border-transparent ring-1 shadow-sm`
          : `border-zinc-200/80 bg-white text-zinc-700 ${color.idle}`
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} aria-hidden />
      {children}
    </button>
  );
}

function PersonaPreviewCard({
  niche,
  audience,
  tones,
  formats,
}: {
  niche: string;
  audience: string;
  tones: string[];
  formats: string[];
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-fuchsia-50 via-rose-50 to-amber-50 p-6 text-zinc-950 shadow-2xl shadow-rose-200/50">
      <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-rose-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-amber-200/60 blur-3xl" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-fuchsia-600 ring-1 ring-fuchsia-200 backdrop-blur">
          <BadgeCheck className="h-3.5 w-3.5" />
          Persona preview
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">
          <span className="bg-gradient-to-r from-fuchsia-600 to-rose-500 bg-clip-text text-transparent">
            {niche || "Digital creator"}
          </span>{" "}
          voice, ready for campaign generation.
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-800">
          Launchy will write for{" "}
          <span className="font-semibold text-zinc-950">{audience || "your audience"}</span> with a{" "}
          <span className="font-semibold text-zinc-950">{(tones.length ? tones : ["clear", "useful"]).join(", ")}</span>{" "}
          tone, then shape each idea into{" "}
          <span className="font-semibold text-zinc-950">{(formats.length ? formats : ["short-form posts", "scripts"]).join(", ")}</span>.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {(tones.length ? tones : ["educational", "creator-led"]).map((tone) => (
            <span
              key={tone}
              className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 backdrop-blur"
            >
              {tone}
            </span>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-dashed border-fuchsia-300/50 bg-white/65 p-4 text-sm text-zinc-800">
          <span className="font-semibold text-zinc-950">Coming soon:</span> persona storage and live campaign generation.
          Use this shell to shape the creator brief before opening the workflow studio.
        </div>
      </div>
    </div>
  );
}

export default function CampaignLandingPage() {
  const [niche, setNiche] = useState("");
  const [audience, setAudience] = useState("");
  const [context, setContext] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [selectedTones, setSelectedTones] = useState<string[]>(["educational", "sharp"]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["TikTok scripts", "Instagram carousels"]);

  const studioQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (niche.trim()) params.set("topic", niche.trim());
    return params.toString() ? `/studio?${params.toString()}` : "/studio";
  }, [niche]);

  const toggle = (value: string, values: string[], setValues: (next: string[]) => void) => {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <div className="relative min-h-full overflow-hidden bg-[#fdf7ee] text-foreground dark:bg-background">
      {/* GLOBAL COLOR WASH */}
      <div className="pointer-events-none fixed inset-0 -z-20 dark:opacity-50">
        <div className="absolute -top-32 left-[-10%] h-[480px] w-[480px] rounded-full bg-fuchsia-300/40 blur-[140px]" />
        <div className="absolute top-0 right-[-10%] h-[520px] w-[520px] rounded-full bg-amber-300/40 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[420px] w-[420px] rounded-full bg-emerald-300/35 blur-[140px]" />
        <div className="absolute bottom-0 right-[10%] h-[420px] w-[420px] rounded-full bg-sky-300/40 blur-[140px]" />
      </div>

      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white shadow-md shadow-rose-300/40">
            <Sparkles className="h-4 w-4" />
          </span>
          Launchy{" "}
          <span className="bg-gradient-to-r from-fuchsia-500 to-orange-400 bg-clip-text text-transparent">Campaigns</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/studio"
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white"
          >
            Studio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/75 px-6 py-16 shadow-2xl shadow-rose-200/40 backdrop-blur md:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(20,20,20,0.06)_1px,transparent_0)] [background-size:26px_26px]" />
          <div className="pointer-events-none absolute -top-24 -left-12 h-72 w-72 rounded-full bg-fuchsia-300/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-amber-300/40 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center text-zinc-950">
            <StaggerReveal stagger={0.06} delayChildren={0.04} amount={0.1}>
              <StaggerItem>
                <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-600 shadow-sm">
                  <Stars className="h-3.5 w-3.5" />
                  Creator onboarding
                </div>
              </StaggerItem>
              <StaggerItem>
                <h1 className="mt-6 text-balance text-5xl font-semibold tracking-[-0.045em] text-zinc-950 md:text-6xl lg:text-7xl">
                  Turn trends into campaigns that sound like{" "}
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-fuchsia-500 via-rose-400 to-orange-400 bg-clip-text italic text-transparent">
                      you.
                    </span>
                    <svg
                      aria-hidden
                      className="absolute -bottom-2 left-0 w-full"
                      viewBox="0 0 100 8"
                      fill="none"
                      preserveAspectRatio="none"
                      height={8}
                    >
                      <path d="M2 5 C 30 0, 70 0, 98 5" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="g" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#d946ef" />
                          <stop offset="100%" stopColor="#fb923c" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-700">
                  Define your voice once, then use Launchy to research what your audience is talking about and shape it into
                  posts, scripts, visuals, and a launch sequence.
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {[
                    { label: "Trend cards",   tone: "bg-amber-100 text-amber-800 ring-amber-300",   Icon: Flame },
                    { label: "TikTok scripts", tone: "bg-cyan-100 text-cyan-700 ring-cyan-300",      Icon: PenLine },
                    { label: "IG carousels",  tone: "bg-pink-100 text-pink-700 ring-pink-300",      Icon: Heart },
                    { label: "Voice match",   tone: "bg-violet-100 text-violet-700 ring-violet-300", Icon: Wand2 },
                  ].map(({ label, tone, Icon }) => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1.5 rounded-full ${tone} px-3 py-1 text-xs font-semibold ring-1`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  ))}
                </div>
              </StaggerItem>
            </StaggerReveal>
          </div>
        </section>

        {/* SOURCES & PLATFORMS */}
        <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 px-4 py-12 shadow-xl shadow-black/5 backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="pointer-events-none absolute -top-16 right-10 h-60 w-60 rounded-full bg-sky-200/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-10 h-60 w-60 rounded-full bg-rose-200/60 blur-3xl" />
          <div className="relative mx-auto max-w-3xl text-center text-zinc-950">
            <ScrollReveal duration={0.55} amount={0.18}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-600">Sources &amp; platforms</p>
                <p className="mt-2 text-sm text-zinc-700">
                  Connects community signals to the channels you actually post on.
                </p>
              </div>
            </ScrollReveal>
            <StaggerReveal className="mt-7 flex flex-wrap justify-center gap-3" stagger={0.035} amount={0.08}>
              {CAMPAIGN_INTEGRATIONS_ALL.map((b) => (
                <StaggerItem key={b.label}>
                  <IntegrationPill {...b} />
                </StaggerItem>
              ))}
            </StaggerReveal>
          </div>
        </section>

        {/* PERSONA BUILDER */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <ScrollReveal direction="right" distance={28} duration={0.5} amount={0.12} className="min-h-0">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white p-7 text-zinc-950 shadow-xl shadow-black/5">
            <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-fuchsia-200/50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-emerald-200/50 blur-3xl" />

            <div className="relative">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                    Build your{" "}
                    <span className="bg-gradient-to-r from-fuchsia-500 to-orange-400 bg-clip-text text-transparent">creator persona</span>
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    Keep it lightweight. The goal is enough taste and context for campaign assets to feel personal.
                  </p>
                </div>
                <span className="hidden rounded-full bg-fuchsia-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-700 ring-1 ring-fuchsia-200 sm:inline-flex">
                  3 min setup
                </span>
              </div>

              <div className="grid gap-5">
                <label className="grid gap-2 text-sm font-medium text-zinc-950">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Your niche or topic
                  </span>
                  <Input
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="AI education, luxury travel, indie skincare..."
                    className="border-rose-200 bg-white text-zinc-950 placeholder:text-zinc-500 focus-visible:ring-rose-300 dark:bg-white dark:text-zinc-950"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-zinc-950">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Who you create for
                  </span>
                  <Input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Founders, students, busy parents, design leaders..."
                    className="border-sky-200 bg-white text-zinc-950 placeholder:text-zinc-500 focus-visible:ring-sky-300 dark:bg-white dark:text-zinc-950"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-zinc-950">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Your perspective, taste, and boundaries
                  </span>
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="What do you believe? What do you avoid saying? What makes your content yours?"
                    className="min-h-28 border-violet-200 bg-white text-zinc-950 placeholder:text-zinc-500 focus-visible:ring-violet-300 dark:bg-white dark:text-zinc-950"
                  />
                </label>

                <div>
                  <div className="text-sm font-medium text-zinc-950">Tone traits</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TONE_TRAITS.map(({ label, color }) => (
                      <Chip
                        key={label}
                        color={color}
                        selected={selectedTones.includes(label)}
                        onClick={() => toggle(label, selectedTones, setSelectedTones)}
                      >
                        {label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-zinc-950">Content formats</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {FORMATS.map(({ label, color }) => (
                      <Chip
                        key={label}
                        color={color}
                        selected={selectedFormats.includes(label)}
                        onClick={() => toggle(label, selectedFormats, setSelectedFormats)}
                      >
                        {label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <label className="grid gap-2 text-sm font-medium text-zinc-950">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-pink-500" /> Optional Instagram profile URL
                  </span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 text-white shadow-sm">
                      <Instagram className="h-3.5 w-3.5" />
                    </span>
                    <Input
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/yourhandle"
                      className="border-pink-200 bg-white pl-11 text-zinc-950 placeholder:text-zinc-500 focus-visible:ring-pink-300 dark:bg-white dark:text-zinc-950"
                    />
                  </div>
                  <span className="text-xs font-normal leading-5 text-zinc-600">
                    By adding a public profile, you consent to Launchy analyzing public captions and visible style cues
                    in a later connected workflow.
                  </span>
                </label>

                <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row">
                  <Link
                    to={studioQuery}
                    className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 px-6 text-sm font-semibold text-white shadow-lg shadow-rose-400/40 transition hover:-translate-y-0.5"
                  >
                    Use this persona
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    to="/studio"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-50"
                  >
                    Try with a topic in Studio
                  </Link>
                </div>
              </div>
            </div>
          </div>
          </ScrollReveal>

          <ScrollReveal direction="left" distance={28} delay={0.08} duration={0.5} amount={0.12} className="min-h-0">
          <div className="space-y-5">
            <PersonaPreviewCard niche={niche} audience={audience} tones={selectedTones} formats={selectedFormats} />
            <StaggerReveal className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1" stagger={0.07} amount={0.1}>
              {[
                { copy: "Find what your audience is talking about.",            tone: "bg-amber-100 text-amber-800 ring-amber-300",   dot: "bg-amber-500" },
                { copy: "Choose the trend with the strongest content angle.",   tone: "bg-rose-100 text-rose-800 ring-rose-300",      dot: "bg-rose-500" },
                { copy: "Generate TikTok, Instagram, LinkedIn, and X assets.",  tone: "bg-violet-100 text-violet-800 ring-violet-300", dot: "bg-violet-500" },
                { copy: "Rewrite everything in your own voice.",                tone: "bg-emerald-100 text-emerald-800 ring-emerald-300", dot: "bg-emerald-500" },
              ].map(({ copy, tone, dot }) => (
                <StaggerItem key={copy}>
                  <div
                    className={`flex items-start gap-3 rounded-3xl border border-white/70 bg-white px-5 py-4 text-sm font-semibold shadow-sm`}
                  >
                    <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone} ring-1`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    </span>
                    <span className="text-zinc-900">{copy}</span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerReveal>
          </div>
          </ScrollReveal>
        </section>
      </main>
    </div>
  );
}

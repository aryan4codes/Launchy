/**
 * Visual / layout inspiration for this marketing surface:
 * https://dribbble.com/shots/25000009-ChronoTask-Landing-Page
 * Vibrant creator-platform overhaul: brand-tinted chips, mesh gradient hero,
 * sticker cards, gradient CTAs.
 */
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  FileText,
  Flame,
  Heart,
  MessageCircle,
  Mic,
  PenLine,
  Play,
  Search,
  Sparkles,
  Stars,
  Wand2,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { CompanyLogo } from "@/components/CompanyLogo";
import { IntegrationPill } from "@/components/marketing/IntegrationPill";
import { ScrollReveal, StaggerItem, StaggerReveal } from "@/components/motion/ScrollReveal";
import { ThemeToggle } from "@/components/theme-toggle";
import { MARKETING_INTEGRATIONS } from "@/lib/integrationBrands";

const HERO_LOGO_STRIP = MARKETING_INTEGRATIONS.slice(0, 8);
const INTEGRATIONS_ROW_1 = MARKETING_INTEGRATIONS.slice(0, 6);
const INTEGRATIONS_ROW_2 = MARKETING_INTEGRATIONS.slice(6, 12);
const INTEGRATIONS_ALL = [...INTEGRATIONS_ROW_1, ...INTEGRATIONS_ROW_2];

type Tone = {
  bg: string;
  ring: string;
  text: string;
  icon: string;
  glow: string;
};

const TONES: Record<string, Tone> = {
  pink:    { bg: "bg-pink-100",    ring: "ring-pink-300/60",    text: "text-pink-700",    icon: "text-pink-600",    glow: "shadow-pink-300/40" },
  amber:   { bg: "bg-amber-100",   ring: "ring-amber-300/60",   text: "text-amber-800",   icon: "text-amber-600",   glow: "shadow-amber-300/40" },
  emerald: { bg: "bg-emerald-100", ring: "ring-emerald-300/60", text: "text-emerald-700", icon: "text-emerald-600", glow: "shadow-emerald-300/40" },
  sky:     { bg: "bg-sky-100",     ring: "ring-sky-300/60",     text: "text-sky-700",     icon: "text-sky-600",     glow: "shadow-sky-300/40" },
  violet:  { bg: "bg-violet-100",  ring: "ring-violet-300/60",  text: "text-violet-700",  icon: "text-violet-600",  glow: "shadow-violet-300/40" },
  rose:    { bg: "bg-rose-100",    ring: "ring-rose-300/60",    text: "text-rose-700",    icon: "text-rose-600",    glow: "shadow-rose-300/40" },
};

const FLOATING_CARDS = [
  { label: "Trend scan",   detail: "Reddit + web signals",     tone: "amber",   className: "left-2 top-24 -rotate-3 hidden lg:block",      Icon: Flame },
  { label: "Voice lock",   detail: "Funny, sharp, useful",     tone: "violet",  className: "right-4 top-28 rotate-2 hidden lg:block",      Icon: Wand2 },
  { label: "Publish plan", detail: "4 platforms, 7 days",      tone: "emerald", className: "bottom-16 left-12 rotate-2 hidden xl:block",   Icon: CalendarDays },
  { label: "Evidence",     detail: "Proof without the dump",   tone: "sky",     className: "bottom-20 right-16 -rotate-2 hidden xl:block", Icon: BadgeCheck },
] as const;

const HOW_IT_WORKS = [
  { title: "Persona",      body: "Define your voice, audience, formats, and no-go language.", tone: "pink",    Icon: BadgeCheck },
  { title: "Trend scan",   body: "Find the signals your audience is starting to repeat.",     tone: "amber",   Icon: Search },
  { title: "Campaign pack", body: "Get scripts, posts, captions, visuals, and hooks.",        tone: "emerald", Icon: FileText },
  { title: "Publish plan", body: "Sequence every asset into a simple launch rhythm.",         tone: "sky",     Icon: CalendarDays },
] as const;

function FloatingCard({
  label,
  detail,
  className,
  tone,
  Icon,
}: {
  label: string;
  detail: string;
  className: string;
  tone: keyof typeof TONES;
  Icon: typeof Flame;
}) {
  const t = TONES[tone];
  return (
    <div
      className={`absolute z-10 flex items-center gap-3 rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-2xl ${t.glow} backdrop-blur ${className}`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.bg} ring-1 ${t.ring}`}>
        <Icon className={`h-4 w-4 ${t.icon}`} />
      </span>
      <div>
        <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${t.text}`}>{label}</div>
        <div className="text-sm font-semibold text-zinc-900">{detail}</div>
      </div>
    </div>
  );
}

function SoftIcon({ tone = "violet", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${t.bg} ring-1 ${t.ring} shadow-inner`}>
      {children}
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-full overflow-hidden bg-[#fdf7ee] font-sans text-foreground antialiased dark:bg-background">
      {/* GLOBAL COLOR WASH */}
      <div className="pointer-events-none fixed inset-0 -z-20 dark:opacity-50">
        <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-pink-300/40 blur-[140px]" />
        <div className="absolute top-10 right-[-10%] h-[520px] w-[520px] rounded-full bg-amber-300/45 blur-[160px]" />
        <div className="absolute top-[40%] left-[20%] h-[420px] w-[420px] rounded-full bg-violet-300/35 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[10%] h-[520px] w-[520px] rounded-full bg-emerald-300/35 blur-[160px]" />
        <div className="absolute bottom-[10%] left-[-5%] h-[420px] w-[420px] rounded-full bg-sky-300/40 blur-[140px]" />
      </div>

      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-orange-400 to-amber-300 text-white shadow-md shadow-pink-300/40">
            <Sparkles className="h-4 w-4" />
          </span>
          Launchy
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <a href="#product" className="transition hover:text-foreground">Product</a>
          <a href="#integrations" className="transition hover:text-foreground">Sources</a>
          <a href="#demo" className="transition hover:text-foreground">Demo</a>
        </nav>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ThemeToggle />
          <Link
            to="/twin"
            className="hidden h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white sm:inline-flex dark:border-border dark:bg-card dark:text-foreground"
          >
            Digital Twin
          </Link>
          <Link
            to="/studio"
            className="hidden h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white sm:inline-flex dark:border-border dark:bg-card dark:text-foreground"
          >
            Studio
          </Link>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative mx-auto flex min-h-[700px] max-w-7xl items-center justify-center px-4 py-16">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,rgba(20,20,20,0.08)_1px,transparent_0)] [background-size:28px_28px] dark:opacity-20" />
          {FLOATING_CARDS.map((card) => (
            <FloatingCard key={card.label} {...card} />
          ))}

          <div className="mx-auto max-w-4xl text-center">
            <StaggerReveal stagger={0.06} delayChildren={0.04} amount={0.08}>
              <StaggerItem>
                <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-600 shadow-sm shadow-fuchsia-200/40 backdrop-blur">
                  <Stars className="h-3.5 w-3.5" aria-hidden />
                  Creator research system
                </div>
              </StaggerItem>
              <StaggerItem>
                <h1 className="font-display text-balance text-5xl font-medium tracking-[-0.03em] text-foreground sm:text-6xl lg:text-[82px] lg:leading-[1.06]">
                  Create <span className="italic text-foreground/90">campaigns</span> that sound{" "}
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-fuchsia-500 via-rose-400 to-orange-400 bg-clip-text font-semibold italic text-transparent">like you.</span>
                    <svg
                      aria-hidden
                      className="absolute -bottom-3 left-0 w-full"
                      viewBox="0 0 240 14"
                      fill="none"
                      preserveAspectRatio="none"
                      height={14}
                    >
                      <path
                        d="M2 9 C 60 0, 180 0, 238 9"
                        stroke="url(#stroke)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <defs>
                        <linearGradient id="stroke" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#d946ef" />
                          <stop offset="50%" stopColor="#fb7185" />
                          <stop offset="100%" stopColor="#fb923c" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-8 text-muted-foreground">
                  Launchy finds what your audience is starting to care about, then turns it into posts, scripts, visuals,
                  and schedules in <span className="font-semibold italic text-zinc-900 dark:text-foreground">your</span>{" "}
                  own voice.
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    to="/campaigns"
                    className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 px-7 text-sm font-semibold text-white shadow-lg shadow-rose-400/40 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-400/50"
                  >
                    Build my Digital Twin
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    to="/studio"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-6 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white dark:border-border dark:bg-card dark:text-foreground"
                  >
                    Open the Digital Twin Studio
                  </Link>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Also:</span>
                  <Link
                    to="/twin?tab=train"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-fuchsia-200/90 bg-white/90 px-4 text-xs font-semibold text-fuchsia-800 shadow-sm transition hover:border-fuchsia-300 hover:bg-white dark:border-fuchsia-500/40 dark:bg-card dark:text-fuchsia-100"
                  >
                    <Mic className="h-3.5 w-3.5" aria-hidden />
                    Train voice
                  </Link>
                  <Link
                    to="/twin"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-violet-200/90 bg-white/90 px-4 text-xs font-semibold text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-white dark:border-violet-500/40 dark:bg-card dark:text-violet-100"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                    Twin chat
                  </Link>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="mx-auto mt-14 max-w-3xl">
                  <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Signals &amp; platforms Digital Twin speaks with
                  </p>
                  <StaggerReveal
                    className="mt-5 flex flex-wrap items-center justify-center gap-2.5"
                    stagger={0.04}
                    delayChildren={0.02}
                    amount={0.05}
                  >
                    {HERO_LOGO_STRIP.map(({ label, domain, tint, accent }, idx) => (
                      <StaggerItem key={label}>
                        <div
                          className="group flex items-center gap-2 rounded-full border border-white/70 bg-white px-3 py-1.5 shadow-md ring-1 ring-black/[0.04] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg"
                          style={{
                            background: `linear-gradient(120deg, ${tint} 0%, #ffffff 75%)`,
                            transform: idx % 2 === 0 ? "rotate(-1deg)" : "rotate(1deg)",
                          }}
                        >
                          <CompanyLogo domain={domain} label={label} size={26} round className="ring-2 ring-white" />
                          <span className="max-w-[8rem] truncate text-xs font-semibold text-zinc-900">{label}</span>
                          <span aria-hidden className="ml-1 h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerReveal>
                </div>
              </StaggerItem>
            </StaggerReveal>
          </div>
        </section>

        {/* PRODUCT — THREE PATHS (Digital Twin · campaigns · studio) */}
        <section id="product" className="mx-auto max-w-7xl px-4 py-16">
          <ScrollReveal duration={0.55} amount={0.25}>
            <div className="mx-auto max-w-2xl text-center">
              <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 shadow-sm">
                Three ways into Launchy
              </div>
              <h2 className="font-display mt-4 text-balance text-4xl font-normal italic tracking-tight md:text-5xl md:leading-[1.12]">
                <span className="bg-gradient-to-r from-fuchsia-500 to-violet-500 bg-clip-text font-semibold not-italic text-transparent">Voice &amp; chat</span>
                ,{" "}
                <span className="bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text font-semibold not-italic text-transparent">campaigns</span>
                , and{" "}
                <span className="bg-gradient-to-r from-violet-500 to-sky-500 bg-clip-text font-semibold not-italic text-transparent">workflows</span>
                .
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Three cards in the same order: Digital Twin, creator campaigns, workflow studio.
              </p>
            </div>
          </ScrollReveal>

          <StaggerReveal className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3" stagger={0.1} amount={0.15}>
            <StaggerItem className="h-full min-h-0">
            {/* DIGITAL TWIN HUB — matches headline first */}
            <Link
              to="/twin"
              className="group relative isolate flex h-full min-h-[240px] w-full flex-col overflow-hidden rounded-[2rem] border border-fuchsia-200/90 bg-fuchsia-50 bg-gradient-to-br from-fuchsia-50 via-violet-50 to-sky-50 p-6 text-left text-zinc-950 no-underline shadow-xl shadow-fuchsia-200/45 [color-scheme:light] transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-fuchsia-300/55 sm:min-h-[260px] sm:p-7 dark:border-fuchsia-300/55 dark:from-fuchsia-100 dark:via-violet-50 dark:to-sky-50 dark:text-zinc-950 dark:shadow-none"
            >
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-300/45 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-violet-300/40 blur-3xl" />

              <div className="relative flex flex-1 flex-col">
                <div className="flex items-center gap-3">
                  <SoftIcon tone="violet">
                    <Mic className="h-5 w-5 text-violet-600" />
                  </SoftIcon>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-700 ring-1 ring-fuchsia-200">
                    Voice + Twin
                  </span>
                </div>
                <h3 className="font-display mt-5 text-2xl font-semibold italic tracking-tight text-zinc-950 sm:mt-6 sm:text-3xl">Train how you sound. Chat in plain English.</h3>
                <p className="mt-2 flex-1 text-sm leading-7 text-zinc-800 sm:mt-3">
                  One hub for voice training (text, links, or Instagram) and the Twin that uses it for drafts, memory, and workflows.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8">
                  {[
                    { label: "Train voice", tint: "from-fuchsia-200 to-fuchsia-100", Icon: Mic, accent: "text-fuchsia-700" },
                    { label: "Twin chat", tint: "from-violet-200 to-violet-100", Icon: MessageCircle, accent: "text-violet-700" },
                  ].map(({ label, tint, Icon, accent }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-2xl border border-white/70 bg-gradient-to-br ${tint} px-2.5 py-2.5 text-xs font-semibold text-zinc-900 shadow-sm sm:px-3 sm:py-3 sm:text-sm`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${accent}`} aria-hidden />
                      {label}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-zinc-600 sm:mt-3">
                  Opens the Digital Twin page — switch tabs between Train voice and Twin chat.
                </p>

                <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold text-fuchsia-800 sm:mt-6 sm:pt-0">
                  Open Digital Twin hub
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
            </StaggerItem>

            <StaggerItem className="h-full min-h-0">
            {/* CREATOR / CAMPAIGNS CARD */}
            <Link
              to="/campaigns"
              className="group relative isolate flex h-full min-h-[240px] w-full flex-col overflow-hidden rounded-[2rem] border border-rose-200/90 bg-rose-50 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 p-6 text-left text-zinc-950 no-underline shadow-xl shadow-rose-200/50 [color-scheme:light] transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-300/60 sm:min-h-[260px] sm:p-7 dark:border-rose-300/55 dark:from-rose-100 dark:via-orange-50 dark:to-amber-100 dark:text-zinc-950 dark:shadow-none"
            >
              <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-rose-300/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-amber-300/40 blur-3xl" />

              <div className="relative flex flex-1 flex-col">
                <div className="flex items-center gap-3">
                  <SoftIcon tone="rose"><Zap className="h-5 w-5 text-rose-600" /></SoftIcon>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600 ring-1 ring-rose-200">
                    For creators
                  </span>
                </div>
                <h3 className="font-display mt-5 text-2xl font-semibold italic tracking-tight text-zinc-950 sm:mt-6 sm:text-3xl">Turn trends into posts.</h3>
                <p className="mt-2 flex-1 text-sm leading-7 text-zinc-800 sm:mt-3">
                  Trend research, creator-persona matching, platform-ready assets, visuals, and a posting sequence.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8">
                  {[
                    { label: "Trend cards",     tint: "from-rose-200 to-rose-100",       Icon: Flame,        accent: "text-rose-600" },
                    { label: "TikTok script",   tint: "from-cyan-200 to-cyan-100",       Icon: PenLine,      accent: "text-cyan-700" },
                    { label: "IG carousel",     tint: "from-fuchsia-200 to-fuchsia-100", Icon: Heart,        accent: "text-fuchsia-700" },
                    { label: "Evidence drawer", tint: "from-amber-200 to-amber-100",     Icon: MessageCircle, accent: "text-amber-700" },
                  ].map(({ label, tint, Icon, accent }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-2xl border border-white/70 bg-gradient-to-br ${tint} px-2.5 py-2.5 text-xs font-semibold text-zinc-900 shadow-sm sm:gap-3 sm:px-3 sm:py-3 sm:text-sm`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${accent}`} />
                      {label}
                    </div>
                  ))}
                </div>

                <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold text-rose-700 sm:mt-7 sm:pt-0">
                  Start creator campaigns
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
            </StaggerItem>

            <StaggerItem className="h-full min-h-0">
            {/* STUDIO CARD */}
            <Link
              to="/studio"
              className="group relative isolate flex h-full min-h-[240px] w-full flex-col overflow-hidden rounded-[2rem] border border-violet-200/90 bg-violet-50 bg-gradient-to-br from-violet-50 via-sky-50 to-emerald-50 p-6 text-left text-zinc-950 no-underline shadow-xl shadow-violet-200/50 [color-scheme:light] transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-300/60 sm:min-h-[260px] sm:p-7 dark:border-violet-300/55 dark:from-violet-100 dark:via-sky-50 dark:to-emerald-100 dark:text-zinc-950 dark:shadow-none"
            >
              <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-sky-300/40 blur-3xl" />

              <div className="relative flex flex-1 flex-col">
                <div className="flex items-center gap-3">
                  <SoftIcon tone="violet"><Wand2 className="h-5 w-5 text-violet-600" /></SoftIcon>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600 ring-1 ring-violet-200">
                    For builders
                  </span>
                </div>
                <h3 className="font-display mt-5 text-2xl font-semibold italic tracking-tight text-zinc-950 sm:mt-6 sm:text-3xl">Build the research machine.</h3>
                <p className="mt-2 flex-1 text-sm leading-7 text-zinc-800 sm:mt-3">
                  Advanced workflow canvas for sources, agents, images, custom prompts, and output pipelines.
                </p>

                <div className="mt-6 rounded-2xl border border-white/70 bg-white/85 p-2.5 shadow-sm sm:mt-8 sm:p-3">
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {[
                      { Icon: Search,       tint: "from-sky-200 to-sky-100",         color: "text-sky-700" },
                      { Icon: Sparkles,     tint: "from-violet-200 to-violet-100",   color: "text-violet-700" },
                      { Icon: PenLine,      tint: "from-emerald-200 to-emerald-100", color: "text-emerald-700" },
                      { Icon: CalendarDays, tint: "from-amber-200 to-amber-100",     color: "text-amber-700" },
                    ].map(({ Icon, tint, color }, index) => (
                      <span key={index} className={`flex h-10 items-center justify-center rounded-xl bg-gradient-to-br sm:h-12 ${tint}`}>
                        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
                      </span>
                    ))}
                  </div>
                </div>

                <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold text-violet-700 sm:mt-7 sm:pt-0">
                  Open workflow studio
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
            </StaggerItem>
          </StaggerReveal>
        </section>

        {/* HOW IT WORKS — colored sticker cards */}
        <section className="mx-auto max-w-7xl px-4 py-16">
          <StaggerReveal className="grid gap-4 md:grid-cols-4" stagger={0.09} amount={0.12}>
            {HOW_IT_WORKS.map(({ title, body, Icon, tone }, idx) => {
              const t = TONES[tone];
              return (
                <StaggerItem key={title}>
                  <div
                    className={`group relative overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-lg ring-1 ring-black/[0.04] transition hover:-translate-y-1 hover:shadow-xl ${t.glow}`}
                    style={{ transform: `rotate(${idx % 2 === 0 ? "-1deg" : "1deg"})` }}
                  >
                  <div className={`absolute inset-x-0 top-0 h-1.5 ${t.bg}`} />
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${t.bg} ring-1 ${t.ring}`}>
                    <Icon className={`h-5 w-5 ${t.icon}`} />
                  </div>
                  <div className={`mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] ${t.text}`}>Step {idx + 1}</div>
                  <h3 className="font-display mt-1 text-xl font-semibold italic text-zinc-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
                </div>
                </StaggerItem>
              );
            })}
          </StaggerReveal>
        </section>

        {/* INTEGRATIONS — vibrant brand pills */}
        <section
          id="integrations"
          className="relative mx-auto my-12 max-w-7xl overflow-hidden rounded-[3rem] border border-white/70 bg-white/70 px-4 py-20 shadow-2xl shadow-black/5 backdrop-blur"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:64px_64px]" />
          <div className="pointer-events-none absolute -top-20 left-10 h-80 w-80 rounded-full bg-rose-200/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-10 h-80 w-80 rounded-full bg-sky-200/60 blur-3xl" />

          <div className="relative mx-auto max-w-5xl text-center text-zinc-950">
            <ScrollReveal blur duration={0.65} amount={0.2}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-600">
                  Sources &amp; outputs
                </p>
                <h2 className="font-display mt-3 text-balance text-4xl font-normal italic tracking-tight text-zinc-950 md:text-5xl md:leading-[1.12]">
                  <span className="bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 bg-clip-text font-semibold not-italic text-transparent">Signals in</span>
                  , <span className="not-italic">platform-ready</span>{" "}
                  <span className="bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500 bg-clip-text font-semibold not-italic text-transparent">assets out</span>
                  .
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-zinc-700">
                  Start with communities and public sources. Leave with creator assets for every channel you actually post on.
                </p>
              </div>
            </ScrollReveal>
            <StaggerReveal className="mt-12 flex flex-wrap justify-center gap-3 md:gap-4" stagger={0.035} amount={0.08}>
              {INTEGRATIONS_ALL.map((b) => (
                <StaggerItem key={b.label}>
                  <IntegrationPill {...b} />
                </StaggerItem>
              ))}
            </StaggerReveal>
          </div>
        </section>

        {/* DEMO / VOICE */}
        <section id="demo" className="mx-auto grid max-w-7xl gap-5 px-4 py-20 lg:grid-cols-[0.95fr_1.05fr]">
          <ScrollReveal direction="left" distance={32} duration={0.55} amount={0.2} className="min-h-0">
            <div className="relative overflow-hidden rounded-[2rem] border border-fuchsia-100 bg-gradient-to-br from-fuchsia-500 via-rose-500 to-orange-400 p-8 text-white shadow-2xl shadow-rose-300/40">
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-60 w-60 rounded-full bg-white/20 blur-3xl" />
            <div className="pointer-events-none absolute -top-10 -left-10 h-44 w-44 rounded-full bg-amber-200/40 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Personality first
              </div>
              <h2 className="font-display mt-6 text-4xl font-medium italic leading-tight tracking-tight">
                Keep the writing aligned with your{" "}
                <span className="not-italic underline decoration-white/60 decoration-[3px] underline-offset-[6px]">actual</span>{" "}
                internet personality.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/85">
                The creator view hides nodes and raw JSON, then gives you the angle, the assets, and the proof behind the recommendation.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <Link
                  to="/twin?tab=train"
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/35 backdrop-blur transition hover:bg-white/30"
                >
                  <Mic className="h-3.5 w-3.5" aria-hidden />
                  Train full voice profile
                </Link>
                <Link
                  to="/twin"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/95 ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  Open Twin chat
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {["funny", "sharp", "calm", "premium", "cinematic"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ring-1 ring-white/30 backdrop-blur"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            </div>
          </ScrollReveal>

          <StaggerReveal className="grid auto-rows-fr gap-4 sm:grid-cols-2" stagger={0.1} amount={0.12}>
            {[
              { copy: "Spot the trend before it becomes generic.",          tone: "amber",   Icon: Flame },
              { copy: "Translate audience signals into sharp angles.",      tone: "violet",  Icon: Wand2 },
              { copy: "Generate TikTok, Instagram, LinkedIn, and X assets.", tone: "sky",    Icon: PenLine },
              { copy: "Review evidence without reading a raw data dump.",    tone: "emerald", Icon: BadgeCheck },
            ].map(({ copy, tone, Icon }) => {
              const t = TONES[tone as keyof typeof TONES];
              return (
                <StaggerItem key={copy} className="h-full min-h-0">
                  <div
                    className="relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white p-6 shadow-xl ring-1 ring-black/[0.04]"
                  >
                  <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full ${t.bg} opacity-80 blur-2xl`} />
                  <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${t.bg} ring-1 ${t.ring}`}>
                    <Icon className={`h-5 w-5 ${t.icon}`} />
                  </div>
                  <p className="font-display relative mt-5 flex-1 text-xl font-medium italic leading-snug text-zinc-950">{copy}</p>
                  <Play className="relative mt-4 h-4 w-4 shrink-0 text-zinc-500" />
                </div>
                </StaggerItem>
              );
            })}
          </StaggerReveal>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-12">
        <ScrollReveal duration={0.55} amount={0.2}>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-gradient-to-br from-amber-100 via-rose-100 to-fuchsia-100 p-10 text-center shadow-2xl shadow-rose-200/40">
          <div className="pointer-events-none absolute -top-10 left-10 h-48 w-48 rounded-full bg-fuchsia-300/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-10 h-56 w-56 rounded-full bg-amber-300/50 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-balance text-4xl font-normal italic tracking-tight text-zinc-950 md:text-5xl md:leading-[1.1]">
              Ready to create <span className="font-semibold not-italic">before</span> everyone else posts it?
            </h2>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/campaigns"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-400/40 transition hover:-translate-y-0.5"
              >
                Build my persona
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/twin"
                className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/30 px-6 py-3 text-sm font-semibold text-zinc-950 backdrop-blur transition hover:bg-white/50"
              >
                <Mic className="h-4 w-4" aria-hidden />
                Digital Twin
              </Link>
              <Link
                to="/studio"
                className="rounded-full border border-zinc-300 bg-white/95 px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-white"
              >
                Open studio
              </Link>
            </div>
          </div>
          </div>
        </ScrollReveal>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© Launchy</span>
          <span className="italic">Made for creators who post like themselves.</span>
        </div>
      </footer>
    </div>
  );
}

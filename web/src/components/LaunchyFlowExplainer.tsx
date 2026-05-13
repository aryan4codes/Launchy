import { ArrowRight, LayoutDashboard, MessageCircle, Mic } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

/** Short explanation of how Voice · Studio · Twin fit together — reuse on Voice, Twin, and Studio empty state. */
export function LaunchyFlowExplainer({
  variant = "compact",
  className,
}: {
  variant?: "compact" | "expanded";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-[2.75rem] border border-border/60 bg-gradient-to-b from-muted/30 to-transparent px-4 py-6 text-left shadow-sm backdrop-blur-sm dark:border-border dark:from-muted/25 sm:px-5",
          className,
        )}
      >
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700/90 dark:text-emerald-400">
          How Launchy fits together
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="relative overflow-hidden rounded-[2rem] border border-emerald-200/50 bg-gradient-to-br from-emerald-50/90 to-white/80 p-4 shadow-sm dark:border-emerald-500/25 dark:from-emerald-950/35 dark:to-card/80 sm:p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-500/30">
              1
            </div>
            <p className="mt-3 text-xs font-semibold leading-snug text-foreground">
              <Link to="/twin?tab=train" className="text-emerald-800 underline-offset-4 hover:underline dark:text-emerald-200">
                Train your voice
              </Link>
              <span className="font-normal text-muted-foreground"> — tone + DO/DON&apos;T lines from real posts.</span>
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-violet-200/40 bg-gradient-to-br from-violet-50/80 to-white/80 p-4 shadow-sm dark:border-border dark:from-violet-950/30 dark:to-card/80 sm:p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-xs font-bold text-white shadow-md">
              2
            </div>
            <p className="mt-3 text-xs font-semibold leading-snug text-foreground">
              <Link to="/studio" className="text-violet-900 underline-offset-4 hover:underline dark:text-violet-200">
                Studio
              </Link>
              <span className="font-normal text-muted-foreground"> workflows or </span>
              <Link to="/twin" className="text-violet-900 underline-offset-4 hover:underline dark:text-violet-200">
                Twin chat
              </Link>
              <span className="font-normal text-muted-foreground"> in plain English.</span>
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-amber-200/45 bg-gradient-to-br from-amber-50/80 to-white/80 p-4 shadow-sm dark:border-amber-500/20 dark:from-amber-950/25 dark:to-card/80 sm:p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white shadow-md">
              3
            </div>
            <p className="mt-3 text-xs leading-snug text-muted-foreground">
              Mark one profile <span className="font-semibold text-foreground">Active</span> — Twin and the{" "}
              <strong className="font-semibold text-foreground">Brand voice</strong> step both follow it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 dark:bg-emerald-500/[0.08]">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <Mic className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-sm font-semibold">1 · Brand voice</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Paste posts or links. Launchy extracts how you sound so generated copy stays on-brand.
        </p>
        <Link
          to="/twin?tab=train"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300"
        >
          Train or edit profiles <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-foreground">
          <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-sm font-semibold">2 · Workflow Studio</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Drag blocks: research → agents → outputs. Add a <strong className="font-medium text-foreground">Brand voice</strong>{" "}
          step so drafts match your profile.
        </p>
        <Link
          to="/studio"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Open Studio <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 dark:bg-violet-500/[0.08]">
        <div className="flex items-center gap-2 text-violet-900 dark:text-violet-100">
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-sm font-semibold">3 · Twin chat</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Ask what to post, rewrite in your voice, or say “run the SaaS launch template” — the Twin calls tools behind the scenes.
        </p>
        <Link
          to="/twin"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-900 underline-offset-4 hover:underline dark:text-violet-200"
        >
          Open Twin <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/** Same mark + wordmark as Workflow Studio header for Voice/Twin consistency. */
export function LaunchyWordmarkNav({
  eyebrow,
  className,
}: {
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 shadow-inner">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" aria-hidden stroke="currentColor" strokeWidth="2.2">
          <path d="M13 3L4 14h7l-1 7 10-12h-7l1-8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="hidden leading-tight sm:block">
        <div className="text-sm font-semibold tracking-tight text-foreground">Launchy</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow ?? "Creator tools"}</div>
      </div>
    </div>
  );
}

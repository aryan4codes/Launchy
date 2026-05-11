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
          "rounded-xl border border-border/80 bg-muted/25 px-3 py-2.5 text-left shadow-sm backdrop-blur-sm dark:bg-muted/40",
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">How Launchy fits together</p>
        <ol className="mt-2 space-y-1.5 text-[12px] leading-snug text-foreground/90">
          <li className="flex gap-2">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">1.</span>
            <span>
              <Link to="/voice" className="font-medium text-foreground underline-offset-4 hover:underline">
                Train your voice
              </Link>{" "}
              once — Launchy learns tone and DO/DON’T rules from your writing.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">2.</span>
            <span>
              Use <strong className="font-medium">Studio</strong> for visual workflows or{" "}
              <Link to="/twin" className="font-medium underline-offset-4 hover:underline">
                Twin chat
              </Link>{" "}
              to ask questions and run templates in plain English.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">3.</span>
            <span>The voice you mark <strong className="font-medium">Active</strong> applies to Twin and to the Brand voice step on the canvas.</span>
          </li>
        </ol>
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
          to="/voice"
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
          to="/"
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

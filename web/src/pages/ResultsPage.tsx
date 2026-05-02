import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState, type Key } from "react";

import { CopyTextButton } from "@/components/CopyTextButton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { NodeOutputCard } from "@/components/results/NodeOutputCard";
import { ResultsPipelineStrip } from "@/components/results/ResultsPipelineStrip";
import { getWorkflowRun } from "@/lib/api";
import {
  extractNodeOutputs,
  extractInputs,
  parseRunMeta,
  partitionResultsBoard,
  pipelineStagesFromPartition,
  type NodeOutputBlock,
} from "@/lib/runPayloadDisplay";
import { cn } from "@/lib/utils";

const SIDE_SCROLL = "max-h-[min(420px,48vh)] overflow-y-auto scrollbar-thin pr-1";

const DELIVERABLE_TAGLINE: Record<string, string> = {
  copy: "Swipe-ready snippets you can paste into posts",
  creative_brief: "Shot list, overlays, and format cues",
  score: "What to publish first—and why",
};

export default function ResultsPage() {
  const { runId = "" } = useParams<{ runId: string }>();
  const [payload, setPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      setErr("Missing run id");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void getWorkflowRun(runId)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Could not load this run.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const meta = useMemo(() => parseRunMeta(payload), [payload]);
  const nodeBlocks = useMemo(() => extractNodeOutputs(payload), [payload]);
  const inputs = useMemo(() => extractInputs(payload), [payload]);

  const board = useMemo(() => partitionResultsBoard(nodeBlocks), [nodeBlocks]);
  const stages = useMemo(() => pipelineStagesFromPartition(board), [board]);

  const fullCopyDigest = useMemo(() => {
    return nodeBlocks
      .filter((b) => b.markdown)
      .map((b) => `## ${b.nodeId}\n\n${b.markdown}`)
      .join("\n\n---\n\n");
  }, [nodeBlocks]);

  const nicheLabel = useMemo(() => {
    if (!inputs) return null;
    const topic = inputs.topic ?? inputs.niche;
    if (typeof topic === "string" && topic.trim()) return topic.trim();
    return null;
  }, [inputs]);

  const status = meta.status ?? "unknown";

  const StatusIcon =
    status === "completed" ? CheckCircle2 : status === "failed" ? XCircle : Clock;
  const statusColor =
    status === "completed"
      ? "text-emerald-600 dark:text-emerald-400"
      : status === "failed"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";
  const statusBadge =
    status === "completed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
      : status === "failed"
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/35 dark:text-red-300"
        : "border-border bg-muted/30 text-muted-foreground";

  const showDashboard =
    board.researchAgents.length > 0 ||
    board.sources.length > 0 ||
    board.transforms.length > 0 ||
    board.strategyAgents.length > 0 ||
    board.middleAgents.length > 0 ||
    board.deliverablesOrdered.length > 0 ||
    board.other.length > 0;

  /** Anything not surfaced in zones above */ 
  const showFallback =
    nodeBlocks.length > 0 &&
    !showDashboard;

  const fallbackBlocks = nodeBlocks;

  const renderCompactCard = (block: NodeOutputBlock, key: Key) => (
    <NodeOutputCard
      key={key}
      nodeId={block.nodeId}
      nodeType={block.nodeType}
      markdown={block.markdown}
      images={block.images}
      compact
      collapsible={false}
      markdownWrapperClass={SIDE_SCROLL}
    />
  );

  const renderCollapsibleResearch = (
    block: NodeOutputBlock,
    key: Key,
    defaultExpanded = false,
  ) => (
    <NodeOutputCard
      key={key}
      nodeId={block.nodeId}
      nodeType={block.nodeType}
      markdown={block.markdown}
      images={block.images}
      compact
      collapsible
      defaultExpanded={defaultExpanded}
      markdownWrapperClass={SIDE_SCROLL}
    />
  );

  if (loading) {
    return (
      <div className="min-h-full bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
          <div className="mt-12 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/40" />
              ))}
            </div>
            <div className="lg:col-span-8 grid gap-3 md:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-muted/40" />
              ))}
            </div>
          </div>
          <div className="mt-8 h-72 animate-pulse rounded-3xl bg-muted/30" />
        </div>
      </div>
    );
  }

  if (err || !payload) {
    return (
      <div className="min-h-full bg-background px-4 py-14">
        <div className="mx-auto max-w-lg rounded-xl border border-border bg-card/80 p-6 text-center backdrop-blur">
          <p className="text-sm text-muted-foreground">{err ?? "Nothing to show yet."}</p>
          <Link
            className="mt-6 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
            to="/"
          >
            Back to studio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-3 px-4 py-3.5 md:items-center md:justify-between md:gap-4">
          <div className="min-w-0 flex-1">
            <Link
              to="/"
              className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Studio
            </Link>
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              {meta.workflowName ? (
                <>
                  Launch analysis{" "}
                  <span className="font-normal text-muted-foreground">
                    · {meta.workflowName}
                  </span>
                </>
              ) : (
                "Launch analysis"
              )}
            </h1>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ThemeToggle />
            <Badge variant="outline" className={cn("gap-1.5 text-[11px]", statusBadge)}>
              <StatusIcon className={cn("h-3 w-3", statusColor)} />
              {status}
            </Badge>
            {fullCopyDigest.trim() ? (
              <CopyTextButton
                text={fullCopyDigest}
                label="Copy all text"
                size="sm"
                variant="secondary"
              />
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/[0.08] via-card to-muted/30 p-6 shadow-sm md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(34,197,94,0.12),_transparent_55%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3 xl:max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ring-1 ring-border/80 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                Full pipeline snapshot
              </div>
              <p className="text-balance text-lg font-semibold leading-snug text-foreground md:text-xl">
                {nicheLabel
                  ? <>Deep viral research &amp; content pack for&nbsp;<span className="text-primary">{nicheLabel}</span></>
                  : "Deep viral research & content pack from this workflow."}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="font-mono">{meta.runId ?? runId}</span>
                <span className="text-border">•</span>
                <span>{nodeBlocks.length} surfaced blocks</span>
              </div>
              {inputs && Object.keys(inputs).length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(inputs).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/70 bg-background/90 px-2.5 py-1 font-mono text-[11px] shadow-sm backdrop-blur"
                      title={`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`}
                    >
                      <span className="shrink-0 font-semibold text-primary">{k}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate text-foreground/90">
                        {typeof v === "string" ? v : JSON.stringify(v)}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="w-full shrink-0 xl:w-auto xl:max-w-[min(100%,540px)]">
              <ResultsPipelineStrip stages={stages} />
            </div>
          </div>
        </section>

        {meta.error ? (
          <section
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
            role="alert"
          >
            <span className="font-semibold">Error:</span> {meta.error}
          </section>
        ) : null}

        {/* Research + narrative dashboard */}
        {!showFallback && showDashboard ? (
          <>
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
              <div className="space-y-4 lg:col-span-5">
                {board.researchAgents.length ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Topic research
                      </h2>
                      <span className="text-[10px] text-muted-foreground">Subreddit discovery</span>
                    </div>
                    {board.researchAgents.map((b) =>
                      renderCollapsibleResearch(b, b.nodeId, true),
                    )}
                  </div>
                ) : null}

                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Community signals
                  </h2>
                  <span className="text-[10px] text-muted-foreground">Sources → context</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {board.sources.map((b) =>
                    renderCollapsibleResearch(b, b.nodeId, false),
                  )}
                </div>
                {board.transforms.length ? (
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Fused briefing
                    </h3>
                    {board.transforms.map((b) => renderCompactCard(b, b.nodeId))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-6 lg:col-span-7">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Audience map & angles
                    </h2>
                    <span className="text-[10px] text-muted-foreground">Strategy row</span>
                  </div>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {board.strategyAgents.map((b) => renderCompactCard(b, b.nodeId))}
                  </div>
                </div>
                {board.middleAgents.length ? (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Narrative & drafts
                    </h2>
                    <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {board.middleAgents.map((b) =>
                        renderCompactCard(b, b.nodeId),
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {board.deliverablesOrdered.length ? (
              <section className="relative overflow-hidden rounded-3xl border-2 border-primary/25 bg-gradient-to-b from-primary/[0.06] via-background to-muted/40 p-6 md:p-8">
                <div className="pointer-events-none absolute left-6 top-0 h-40 w-40 rounded-full bg-primary/[0.12] blur-3xl md:left-14" />
                <div className="relative mb-8 max-w-2xl space-y-1">
                  <h2 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
                    Your go-to-market pack
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Copy-ready creative, briefing notes, and a simple priority read—laid out
                    horizontally so teams can skim the launch story fast.
                  </p>
                </div>
                <div className="relative grid gap-6 xl:grid-cols-3">
                  {board.deliverablesOrdered.map((b) => (
                    <div key={b.nodeId} className="flex min-h-[280px] flex-col rounded-2xl border-2 border-primary/20 bg-card shadow-md shadow-primary/5">
                      <div className="border-b border-border px-5 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                          {b.nodeId}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {DELIVERABLE_TAGLINE[b.nodeId] ?? "Final workflow output"}
                        </p>
                      </div>
                      <div className="flex-1">
                        <NodeOutputCard
                          nodeId={b.nodeId}
                          nodeType={b.nodeType}
                          markdown={b.markdown}
                          images={b.images}
                          collapsible={false}
                          suppressHeader
                          markdownWrapperClass="max-h-[min(70vh,640px)] overflow-y-auto scrollbar-thin"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {board.other.map((b) => (
              <NodeOutputCard
                key={b.nodeId}
                nodeId={b.nodeId}
                nodeType={b.nodeType}
                markdown={b.markdown}
                images={b.images}
                defaultExpanded={false}
              />
            ))}
          </>
        ) : null}

        {showFallback ? (
          <div className="grid gap-4 md:grid-cols-2">
            {fallbackBlocks.map((b) => (
              <NodeOutputCard
                key={b.nodeId}
                nodeId={b.nodeId}
                nodeType={b.nodeType}
                markdown={b.markdown}
                images={b.images}
                defaultExpanded={b.nodeType?.startsWith("agent.") ?? false}
              />
            ))}
          </div>
        ) : null}

        {!showDashboard && nodeBlocks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            No outputs were surfaced for this layout. Re-run after steps finish emitting text, or expand the cards above
            if any are collapsed.
          </p>
        ) : null}
      </main>
    </div>
  );
}

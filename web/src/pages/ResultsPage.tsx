import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  MousePointerClick,
  ScanSearch,
  Rocket,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState, type Key } from "react";

import { CopyTextButton } from "@/components/CopyTextButton";
import { AnalysisWorkbench } from "@/components/results/AnalysisWorkbench";
import { ImageGallery } from "@/components/results/ImageGallery";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NodeOutputCard } from "@/components/results/NodeOutputCard";
import { ResultsPipelineStrip } from "@/components/results/ResultsPipelineStrip";
import { RunInputsCard } from "@/components/results/RunInputsCard";
import { getWorkflowRun } from "@/lib/api";
import {
  extractNodeOutputs,
  extractInputs,
  parseRunMeta,
  partitionResultsBoard,
  pipelineStagesFromPartition,
  workflowIncludesInstagramSource,
  type NodeOutputBlock,
} from "@/lib/runPayloadDisplay";
import { cn } from "@/lib/utils";

const SIDE_SCROLL = "max-h-[min(420px,48vh)] overflow-y-auto scrollbar-thin pr-1";

const SECTION_NAV = [
  { id: "previews", label: "Previews" },
  { id: "summary", label: "How to use" },
  { id: "research", label: "Research" },
  { id: "strategy", label: "Analysis workspace" },
  { id: "pack", label: "Launch pack" },
] as const;

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
  const instagramSignals = useMemo(() => {
    const enabled = workflowIncludesInstagramSource(payload);
    let fetched = false;
    let actor: string | null = null;
    let rows = 0;

    for (const block of nodeBlocks) {
      const md = block.markdown;
      if (!md) continue;
      if (md.includes("### Instagram hashtag signals") || md.includes("### Instagram creator post signals"))
        fetched = true;
      const actorMatch = md.match(/^Actor:\s+(.+)$/m);
      if (actorMatch && !actor) actor = actorMatch[1]?.trim() ?? null;
      const itemMatches = md.match(/^- \(.+likes.+comments\)/gm);
      if (itemMatches?.length) rows += itemMatches.length;
    }

    return {
      enabled,
      fetched,
      actor,
      rows,
    };
  }, [payload, nodeBlocks]);

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
  const workbenchSections = useMemo(() => {
    const sections: Array<{
      id: string;
      title: string;
      description: string;
      blocks: NodeOutputBlock[];
    }> = [];
    if (board.strategyAgents.length) {
      sections.push({
        id: "strategy",
        title: "Audience map and angles",
        description: "Choose the best audience angle before drafting final posts.",
        blocks: board.strategyAgents,
      });
    }
    if (board.middleAgents.length) {
      sections.push({
        id: "narrative",
        title: "Narrative and drafts",
        description: "Explore supporting narratives and draft variants.",
        blocks: board.middleAgents,
      });
    }
    if (board.deliverablesOrdered.length) {
      sections.push({
        id: "pack",
        title: "Launch pack",
        description: "Final publish-ready assets with priority recommendations.",
        blocks: board.deliverablesOrdered,
      });
    }
    return sections;
  }, [board.deliverablesOrdered, board.middleAgents, board.strategyAgents]);
  const topImages = useMemo(() => {
    const dedup = new Map<string, NodeOutputBlock["images"][number]>();
    for (const b of nodeBlocks) {
      for (const im of b.images) {
        if (!dedup.has(im.path)) dedup.set(im.path, im);
      }
    }
    return [...dedup.values()].slice(0, 8);
  }, [nodeBlocks]);

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
      <div
        className="min-h-full bg-background"
        aria-busy="true"
        aria-label="Loading run results"
      >
        <div className="mx-auto max-w-7xl px-4 py-12">
          <Skeleton className="h-8 w-56 rounded-md" />
          <div className="mt-12 grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl bg-muted/50" />
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:col-span-8">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl bg-muted/50" />
              ))}
            </div>
          </div>
          <Skeleton className="mt-8 h-72 rounded-3xl bg-muted/40" />
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
            to="/studio"
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-3 px-4 py-2.5 md:items-center md:justify-between md:gap-4">
          <div className="min-w-0 flex-1">
            <Link
              to="/studio"
              className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Studio
            </Link>
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-2xl">
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
            <Link
              to={`/campaigns/${encodeURIComponent(runId)}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-primary/35 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              Open Creator Campaign
            </Link>
            <Badge variant="outline" className={cn("gap-1.5 text-[11px]", statusBadge)}>
              <StatusIcon className={cn("h-3 w-3", statusColor)} />
              {status}
            </Badge>
            {fullCopyDigest.trim() ? (
              <CopyTextButton
                text={fullCopyDigest}
                label="Copy full report"
                size="sm"
                variant="secondary"
              />
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 overflow-x-hidden px-4 py-6 md:py-8">
        {topImages.length ? (
          <section id="previews" className="space-y-3 rounded-2xl border border-border bg-card/70 p-4 shadow-sm md:p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Creative previews</h2>
              <p className="text-sm text-muted-foreground">
                Scan visuals first. Open any image to inspect quality before reading long analysis.
              </p>
            </div>
            <ImageGallery images={topImages} />
          </section>
        ) : null}

        <section id="summary" className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Rocket className="h-3.5 w-3.5 text-primary" aria-hidden />
                Operator results
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                This page keeps workflow details, source outputs, and diagnostics. For a simpler creator workspace, open
                the campaign view.
              </p>
            </div>
            <Link
              to={`/campaigns/${encodeURIComponent(runId)}`}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background"
            >
              Open Creator Campaign
            </Link>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-lg bg-muted/30 px-3 py-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
                <ScanSearch className="h-4 w-4 text-primary" />
                1. Pick the best visual
              </div>
              <p className="text-xs text-muted-foreground">
                Start from Creative previews and shortlist what looks publishable.
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
                <MousePointerClick className="h-4 w-4 text-primary" />
                2. Review one node at a time
              </div>
              <p className="text-xs text-muted-foreground">
                In Analysis workspace, click a node on the left to read it in full on the right.
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
                <Rocket className="h-4 w-4 text-primary" />
                3. Copy and publish faster
              </div>
              <p className="text-xs text-muted-foreground">
                Use Copy section for clean extraction, then adapt for your platform.
              </p>
            </div>
          </div>
          <dl className="mt-3 grid gap-2 border-t border-border pt-3 text-xs md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-foreground capitalize">{status}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Visible output blocks</dt>
                <dd className="text-foreground">{nodeBlocks.length}</dd>
              </div>
            </div>
            <div className="space-y-2">
              {nicheLabel ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Topic</dt>
                  <dd className="text-right text-foreground">{nicheLabel}</dd>
                </div>
              ) : null}
              {instagramSignals.enabled ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Instagram signals</dt>
                  <dd className="text-right text-foreground">
                    {instagramSignals.fetched
                      ? `Fetched${instagramSignals.rows > 0 ? ` (${instagramSignals.rows})` : ""}`
                      : "Enabled (none captured)"}
                  </dd>
                </div>
              ) : null}
            </div>
            <div>
              <div>
                <dt className="text-muted-foreground">Run ID</dt>
                <dd className="mt-0.5 font-mono text-[11px] text-foreground break-all">{meta.runId ?? runId}</dd>
              </div>
              {instagramSignals.enabled && instagramSignals.actor ? (
                <div className="mt-2">
                  <dt className="text-muted-foreground">Instagram actor</dt>
                  <dd className="mt-0.5 text-[11px] text-foreground break-all">{instagramSignals.actor}</dd>
                </div>
              ) : null}
            </div>
          </dl>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/[0.08] via-card to-muted/30 p-6 shadow-sm md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(34,197,94,0.12),_transparent_55%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3 xl:max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ring-1 ring-border/80 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                Pipeline snapshot
              </div>
              <p className="text-balance text-lg font-semibold leading-snug text-foreground md:text-xl">
                {nicheLabel
                  ? <>Decision-ready social launch analysis for&nbsp;<span className="text-primary">{nicheLabel}</span></>
                  : "Decision-ready social launch analysis from this workflow."}
              </p>
              <p className="text-sm text-muted-foreground">
                Use the sections below to move from research to platform-ready outputs quickly.
              </p>
              {inputs && Object.keys(inputs).length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Run context loaded below for reference and reproducibility.
                </p>
              ) : null}
            </div>
            <div className="w-full shrink-0 xl:w-auto xl:max-w-[min(100%,540px)]">
              <ResultsPipelineStrip stages={stages} />
            </div>
          </div>
        </section>

        <nav className="sticky top-[53px] z-30 rounded-xl border border-border bg-background/90 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <ul className="flex flex-wrap gap-2">
            {SECTION_NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="inline-flex items-center rounded-full border border-border/70 bg-muted/20 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {inputs && Object.keys(inputs).length > 0 ? (
          <RunInputsCard inputs={inputs} />
        ) : null}

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
            <section id="research" className="space-y-4">
              <div className="rounded-xl border border-border/80 bg-card/60 px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Research signals</h2>
                <p className="text-xs text-muted-foreground">
                  Audience language, trend evidence, and context snapshots.
                </p>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-border/80 bg-card/60 px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Topic research
                  </h3>
                </div>
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
            </section>

            {workbenchSections.length ? (
              <section id="strategy" className="space-y-4">
                <div className="rounded-xl border border-border/80 bg-card/60 px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Analysis workspace</h2>
                  <p className="text-xs text-muted-foreground">
                    Use the left rail to pick a node. The right panel gives full reading and copying space.
                  </p>
                </div>
                {board.deliverablesOrdered.length ? <div id="pack" className="scroll-mt-28" /> : null}
                <AnalysisWorkbench sections={workbenchSections} />
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

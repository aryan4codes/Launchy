import { ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { CopyTextButton } from "@/components/CopyTextButton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NodeOutputCard } from "@/components/results/NodeOutputCard";
import { RunInputsCard } from "@/components/results/RunInputsCard";
import { RawJsonDrawer } from "@/components/results/RawJsonDrawer";
import { getWorkflowRun } from "@/lib/api";
import {
  extractNodeOutputs,
  extractInputs,
  parseRunMeta,
} from "@/lib/runPayloadDisplay";
import { cn } from "@/lib/utils";

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

  const fullCopyDigest = useMemo(() => {
    return nodeBlocks
      .filter((b) => b.markdown)
      .map((b) => `## ${b.nodeId}\n\n${b.markdown}`)
      .join("\n\n---\n\n");
  }, [nodeBlocks]);

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

  if (loading) {
    return (
      <div className="min-h-full bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="mt-3 h-4 w-32 animate-pulse rounded-md bg-muted/50" />
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
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
    <div className="min-h-full bg-background pb-24">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link
              to="/"
              className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Studio
            </Link>
            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
              {meta.workflowName ? (
                <>
                  Results{" "}
                  <span className="font-normal text-muted-foreground">· {meta.workflowName}</span>
                </>
              ) : (
                "Run results"
              )}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Badge variant="outline" className={cn("gap-1.5 text-[11px]", statusBadge)}>
              <StatusIcon className={cn("h-3 w-3", statusColor)} />
              {status}
            </Badge>
            {fullCopyDigest.trim() && (
              <CopyTextButton text={fullCopyDigest} label="Copy all" size="sm" variant="secondary" />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* ── Run ID + quick meta ── */}
        <div className="mb-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono">{meta.runId ?? runId}</span>
          <span className="text-border">•</span>
          <span>{nodeBlocks.length} output{nodeBlocks.length !== 1 ? "s" : ""}</span>
        </div>

        {/* ── Error banner ── */}
        {meta.error && (
          <section
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/25 dark:text-red-200"
            role="alert"
          >
            <span className="font-semibold">Error:</span> {meta.error}
          </section>
        )}

        {/* ── Run inputs ── */}
        {inputs && Object.keys(inputs).length > 0 && (
          <div className="mb-6">
            <RunInputsCard inputs={inputs} />
          </div>
        )}

        {/* ── Node output cards ── */}
        {nodeBlocks.length > 0 ? (
          <div className="space-y-4">
            {nodeBlocks.map((block) => {
              const isAgent = block.nodeType?.startsWith("agent.") ?? false;
              const isOutput = block.nodeType?.startsWith("output.") ?? false;
              return (
                <NodeOutputCard
                  key={block.nodeId}
                  nodeId={block.nodeId}
                  nodeType={block.nodeType}
                  markdown={block.markdown}
                  images={block.images}
                  defaultExpanded={isAgent || isOutput}
                />
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            No outputs were emitted in this run. Use{" "}
            <span className="font-semibold text-foreground">Copy JSON</span> for the full artifact.
          </p>
        )}

        <Separator className="my-10 opacity-40" />

        {/* ── Raw JSON ── */}
        <RawJsonDrawer payload={payload} />
      </main>
    </div>
  );
}

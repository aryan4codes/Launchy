import { ArrowLeft, ImageIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { CopyTextButton } from "@/components/CopyTextButton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getWorkflowRun } from "@/lib/api";
import {
  extractRunSections,
  parseRunMeta,
} from "@/lib/runPayloadDisplay";
import { cn } from "@/lib/utils";

function joinAllExportableTexts(
  texts: { nodeLabel: string; field: string; body: string }[],
  inputsJson: string,
): string {
  const chunks: string[] = [];
  if (inputsJson.trim())
    chunks.push(`## Inputs\n${inputsJson.trim()}`);
  for (const t of texts) {
    chunks.push(`## ${t.nodeLabel} (${t.field})\n\n${t.body}`);
  }
  return chunks.join("\n\n––––––––––––––––––––\n\n");
}

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
  const { texts, images } = useMemo(() => extractRunSections(payload), [payload]);

  const inputsJson = useMemo(() => {
    if (!payload || typeof payload !== "object" || !("inputs" in payload)) return "";
    try {
      return JSON.stringify(
        (payload as { inputs?: unknown }).inputs ?? {},
        null,
        2,
      );
    } catch {
      return "";
    }
  }, [payload]);

  const fullCopyDigest = useMemo(
    () => joinAllExportableTexts(texts, inputsJson),
    [texts, inputsJson],
  );

  const status = meta.status ?? "unknown";
  const statusTone =
    status === "completed"
      ? "border-emerald-500/35 bg-emerald-950/30 text-emerald-200"
      : status === "failed"
        ? "border-red-500/35 bg-red-950/35 text-red-200"
        : "border-border bg-muted/30 text-muted-foreground";

  if (loading) {
    return (
      <div className="min-h-full bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="mt-8 h-[220px] animate-pulse rounded-xl bg-muted/50" />
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
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-start justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <Link
              to="/"
              className="mb-2 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Studio
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              {meta.workflowName ? (
                <>
                  Results · <span className="text-muted-foreground">{meta.workflowName}</span>
                </>
              ) : (
                "Run results"
              )}
            </h1>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              Run <span className="text-zinc-300">{meta.runId ?? runId}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-[11px]", statusTone)}>
              {status}
            </Badge>
            {fullCopyDigest.trim() ? (
              <CopyTextButton text={fullCopyDigest} label="Copy all text" size="sm" variant="secondary" />
            ) : null}
            <CopyTextButton
              text={(() => {
                try {
                  return JSON.stringify(payload, null, 2);
                } catch {
                  return String(payload);
                }
              })()}
              label="Copy JSON"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {meta.error ? (
          <section
            className="mb-8 rounded-xl border border-red-500/30 bg-red-950/25 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            <span className="font-semibold">Error:</span> {meta.error}
          </section>
        ) : null}

        {inputsJson.trim() ? (
          <section className="mb-10 rounded-xl border border-border bg-card/40 p-4 shadow-sm backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Run inputs
              </h2>
              <CopyTextButton text={inputsJson} label="Copy" size="sm" />
            </div>
            <pre className="scrollbar-thin max-h-[200px] overflow-auto whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-zinc-200 selection:bg-emerald-500/30 selection:text-emerald-50">
              {inputsJson}
            </pre>
          </section>
        ) : null}

        {images.length > 0 ? (
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <ImageIcon className="h-4 w-4 opacity-70" aria-hidden />
              Generated images
            </div>
            <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2">
              {images.map((im) => (
                <figure
                  key={`${im.path}-${im.nodeLabel}`}
                  className="overflow-hidden rounded-2xl border border-border bg-zinc-900/80 shadow-xl"
                >
                  <a
                    href={im.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-[radial-gradient(ellipse_at_top,_#1a2e29_0%,_transparent_60%)] p-4"
                  >
                    <img
                      src={im.href}
                      alt=""
                      className="mx-auto max-h-[min(56vh,480px)] w-auto max-w-full rounded-lg object-contain"
                    />
                  </a>
                  <figcaption className="space-y-3 border-t border-border/80 bg-black/35 px-4 py-4">
                    <p className="text-[11px] text-muted-foreground">
                      Source block: <span className="font-medium text-foreground">{im.nodeLabel}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <CopyTextButton text={im.copyHref} label="Copy image URL" size="sm" />
                      <CopyTextButton
                        text={`![generated](${im.copyHref})`}
                        label="Copy markdown"
                        size="sm"
                        variant="outline"
                      />
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {texts.length > 0 ? (
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Copy-ready output
            </h2>
            <div className="space-y-6">
              {texts.map((t, idx) => (
                <article
                  key={`${t.nodeLabel}-${t.field}-${idx}`}
                  className="rounded-xl border border-border bg-card/35 p-4 shadow-sm backdrop-blur-sm"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[13px] font-semibold text-foreground">{t.nodeLabel}</span>
                      <span className="ml-2 rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {t.field}
                      </span>
                    </div>
                    <CopyTextButton text={t.body} label="Copy" size="sm" />
                  </div>
                  <div className="rounded-lg bg-background/60 p-4 text-[15px] leading-relaxed tracking-tight text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-50">
                    <pre className="whitespace-pre-wrap font-sans">{t.body}</pre>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {texts.length === 0 && images.length === 0 ? (
          <p className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            No headline text or image paths were emitted in this run. Use{" "}
            <span className="font-semibold text-foreground">Copy JSON</span> for the full artifact.
          </p>
        ) : null}

        <Separator className="my-12 opacity-40" />

        <details className="group rounded-xl border border-border/60 bg-muted/10">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Technical · raw run JSON
          </summary>
          <pre className="scrollbar-thin max-h-[50vh] overflow-auto border-t border-border/60 p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
            {(() => {
              try {
                return JSON.stringify(payload, null, 2);
              } catch {
                return String(payload);
              }
            })()}
          </pre>
        </details>
      </main>
    </div>
  );
}

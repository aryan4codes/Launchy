import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { MarkdownProse } from "@/components/MarkdownProse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCatalogEntry } from "@/lib/nodeCatalog";
import type { DisplayImageBlock } from "@/lib/runPayloadDisplay";
import { ImageGallery } from "./ImageGallery";
import { tryParseSerperJson, SearchResults } from "./SearchResults";

/** Put long “JUSTIFICATION & NOTES” tails in a collapsible block for score / rank tables. */
function splitScoreMarkdown(markdown: string): { body: string; justification: string | null } {
  const md = markdown.trimEnd();
  if (!md) return { body: markdown, justification: null };

  const take = (idx: number): { body: string; justification: string } | null =>
    idx > 0 ? { body: md.slice(0, idx).trimEnd(), justification: md.slice(idx).trimStart() } : null;

  const heading = /^#{1,3}\s*JUSTIFICATION\b/im.exec(md);
  if (heading?.index != null) {
    const r = take(heading.index);
    if (r) return { body: r.body, justification: r.justification };
  }

  const bold = /\*\*\s*JUSTIFICATION\s*&\s*NOTES?\s*\*\*/i.exec(md);
  if (bold?.index != null) {
    const r = take(bold.index);
    if (r) return { body: r.body, justification: r.justification };
  }

  const loose = /\n\s*JUSTIFICATION\s*&\s*NOTES?\b/im.exec(md);
  if (loose?.index != null) {
    const r = take(loose.index);
    if (r?.justification) return { body: r.body, justification: r.justification };
  }

  return { body: md, justification: null };
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };
  return { copied, copy };
}

export function NodeOutputCard({
  nodeId,
  nodeType,
  markdown,
  images,
  defaultExpanded = true,
  compact = false,
  collapsible = true,
  markdownWrapperClass,
  suppressHeader = false,
}: {
  nodeId: string;
  nodeType: string | null;
  markdown: string;
  images: DisplayImageBlock[];
  defaultExpanded?: boolean;
  compact?: boolean;
  collapsible?: boolean;
  /** e.g. max-h plus overflow for dense dashboard columns */
  markdownWrapperClass?: string;
  /** Markdown / gallery only — for nested marketing columns */
  suppressHeader?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { copied, copy } = useCopy(markdown);

  const cat = getCatalogEntry(nodeType ?? "unknown");
  const Icon: LucideIcon = cat.icon;

  const categoryColorMap: Record<string, string> = {
    source: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    agent: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    transform: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    media: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    output: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    memory: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
    trigger: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  };
  const tagColor = categoryColorMap[cat.category] ?? categoryColorMap.transform;

  const scoreParts =
    nodeId === "score" && markdown.trim() ? splitScoreMarkdown(markdown) : null;
  const markdownBody = scoreParts?.body ?? markdown;

  const serperData = markdownBody.trim() ? tryParseSerperJson(markdownBody) : null;

  // Subreddit list: comma-separated single-line strings with no spaces/markdown
  const isSubredditList =
    nodeId === "subreddit_researcher" &&
    markdown.trim() &&
    !markdown.includes("\n") &&
    markdown.split(",").length > 1;

  const subredditPills = isSubredditList
    ? markdown
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-primary/30",
        compact && !suppressHeader && "rounded-lg shadow-none hover:border-border",
        suppressHeader && "border-0 shadow-none rounded-none bg-transparent",
      )}
    >
      {!suppressHeader ? (
        collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex w-full items-center gap-3 text-left hover:bg-muted/30 transition-colors",
              compact ? "px-4 py-3" : "px-5 py-4",
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg",
                compact ? "h-8 w-8" : "h-9 w-9",
                tagColor,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground truncate">{cat.label}</span>
                {!compact ? <span className="text-[11px] text-muted-foreground">#{nodeId}</span> : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{cat.short}</p>
            </div>
            <span className="shrink-0 text-muted-foreground">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          </button>
        ) : (
          <div
            className={cn(
              "flex items-center gap-3 border-b border-border bg-muted/20",
              compact ? "px-4 py-3" : "px-5 py-4",
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg",
                compact ? "h-8 w-8" : "h-9 w-9",
                tagColor,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground truncate">{cat.label}</span>
                {!compact ? <span className="text-[11px] text-muted-foreground">#{nodeId}</span> : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{cat.short}</p>
            </div>
          </div>
        )
      ) : null}

      {((!suppressHeader && (!collapsible || expanded)) || suppressHeader) &&
      !!(markdown.trim() || images.length > 0) ? (
        <div className={cn(!suppressHeader && collapsible && "border-t border-border")}>
          {markdown.trim() ? (
            <div className={cn(compact ? "px-4 py-3" : "px-5 py-4")}>
              <div className="mb-3 flex shrink-0 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 bg-background text-xs shadow-sm"
                  onClick={() => void copy()}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy section"}
                </Button>
              </div>
              <div className={cn("min-w-0 break-words", markdownWrapperClass)}>
                {subredditPills ? (
                  <div className="flex flex-wrap gap-2 py-1">
                    {subredditPills.map((sub) => (
                      <a
                        key={sub}
                        href={`https://reddit.com/r/${sub}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 transition-colors hover:bg-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800/50 dark:hover:bg-orange-900/50"
                      >
                        r/{sub}
                      </a>
                    ))}
                  </div>
                ) : serperData ? (
                  <SearchResults data={serperData} />
                ) : (
                  <>
                    <MarkdownProse content={markdownBody} />
                    {scoreParts?.justification ? (
                      <details className="mt-4 rounded-lg border border-border bg-muted/15 open:bg-muted/25">
                        <summary className="cursor-pointer select-none rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40">
                          Justification & notes
                        </summary>
                        <div className="border-t border-border px-3 py-3">
                          <MarkdownProse content={scoreParts.justification} />
                        </div>
                      </details>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : null}
          {images.length > 0 ? (
            <div className={cn(markdown.trim() && "border-t border-border")}>
              <ImageGallery images={images} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

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

  const serperData = markdown.trim() ? tryParseSerperJson(markdown) : null;

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
        "rounded-xl border border-border bg-card shadow-sm overflow-hidden",
        compact && !suppressHeader && "rounded-lg shadow-none",
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
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {nodeId}
                </span>
              </div>
              {!compact && <p className="mt-0.5 text-xs text-muted-foreground truncate">{cat.short}</p>}
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
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {nodeId}
                </span>
              </div>
              {!compact && <p className="mt-0.5 text-xs text-muted-foreground truncate">{cat.short}</p>}
            </div>
          </div>
        )
      ) : null}

      {((!suppressHeader && (!collapsible || expanded)) || suppressHeader) &&
      !!(markdown.trim() || images.length > 0) ? (
        <div className={cn(!suppressHeader && collapsible && "border-t border-border")}>
          {markdown.trim() ? (
            <div className={cn("relative", compact ? "px-4 py-3" : "px-5 py-4")}>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-3 top-3 z-10 h-7 gap-1 text-xs text-muted-foreground"
                onClick={() => void copy()}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <div className={cn(markdownWrapperClass)}>
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
                  <MarkdownProse content={markdown} />
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

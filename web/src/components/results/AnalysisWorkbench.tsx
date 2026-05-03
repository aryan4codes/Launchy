import { useEffect, useMemo, useState } from "react";

import { NodeOutputCard } from "@/components/results/NodeOutputCard";
import { Badge } from "@/components/ui/badge";
import { type NodeOutputBlock } from "@/lib/runPayloadDisplay";
import { getCatalogEntry } from "@/lib/nodeCatalog";
import { cn } from "@/lib/utils";

export type AnalysisWorkbenchSection = {
  id: string;
  title: string;
  description: string;
  blocks: NodeOutputBlock[];
};

function firstMeaningfulLine(markdown: string): string | null {
  const clean = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("|"));
  return clean ?? null;
}

type WorkbenchBlock = NodeOutputBlock & {
  sectionId: string;
  sectionTitle: string;
  sectionDescription: string;
};

export function AnalysisWorkbench({
  sections,
}: {
  sections: AnalysisWorkbenchSection[];
}) {
  const flatBlocks = useMemo<WorkbenchBlock[]>(() => {
    const blocks: WorkbenchBlock[] = [];
    for (const section of sections) {
      for (const block of section.blocks) {
        blocks.push({
          ...block,
          sectionId: section.id,
          sectionTitle: section.title,
          sectionDescription: section.description,
        });
      }
    }
    return blocks;
  }, [sections]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    flatBlocks[0]?.nodeId ?? null,
  );

  useEffect(() => {
    if (!flatBlocks.length) {
      setSelectedNodeId(null);
      return;
    }
    if (!selectedNodeId || !flatBlocks.some((b) => b.nodeId === selectedNodeId)) {
      setSelectedNodeId(flatBlocks[0].nodeId);
    }
  }, [flatBlocks, selectedNodeId]);

  const selected = flatBlocks.find((b) => b.nodeId === selectedNodeId) ?? flatBlocks[0];
  if (!selected) return null;

  const selectedMeta = getCatalogEntry(selected.nodeType ?? "unknown");

  return (
    <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-border bg-card/70 p-3 shadow-sm xl:sticky xl:top-[120px] xl:h-fit">
        <div className="mb-2 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Node outputs
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick a node on the left to view and copy its full analysis on the right.
          </p>
        </div>
        <div className="max-h-[calc(100vh-11rem)] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
          {sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {section.title}
              </p>
              <div className="space-y-1.5">
                {section.blocks.map((block) => {
                  const isActive = block.nodeId === selected.nodeId;
                  const preview = firstMeaningfulLine(block.markdown);
                  const cat = getCatalogEntry(block.nodeType ?? "unknown");
                  return (
                    <button
                      key={block.nodeId}
                      type="button"
                      onClick={() => setSelectedNodeId(block.nodeId)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                        isActive
                          ? "border-primary/45 bg-primary/10"
                          : "border-border bg-background/70 hover:border-primary/25 hover:bg-muted/35",
                      )}
                    >
                      <p className="truncate text-sm font-semibold text-foreground">{cat.label}</p>
                      {preview ? (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {preview}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          No text body in this node output.
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <article className="min-w-0 rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.14em]">
              {selected.sectionTitle}
            </Badge>
            <span className="text-xs text-muted-foreground">{selectedMeta.label}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{selected.sectionDescription}</p>
        </div>
        <div className="min-w-0 px-5 py-4">
          <NodeOutputCard
            nodeId={selected.nodeId}
            nodeType={selected.nodeType}
            markdown={selected.markdown}
            images={selected.images}
            collapsible={false}
            compact={false}
            suppressHeader
            markdownWrapperClass="max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-thin pr-1"
          />
        </div>
      </article>
    </section>
  );
}

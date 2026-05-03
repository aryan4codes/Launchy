import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResultsPipelineStrip({ stages }: { stages: string[] }) {
  if (stages.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-xl border border-border/80 bg-muted/35 px-3 py-2.5 md:justify-end md:rounded-2xl md:px-4"
      aria-label="Analysis stages"
    >
      {stages.map((stage, idx) => (
        <Fragment key={`${stage}-${idx}`}>
          {idx > 0 ? (
            <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground/70 sm:inline" aria-hidden />
          ) : null}
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
              idx === stages.length - 1
                ? "bg-primary/15 text-primary ring-1 ring-primary/40 shadow-sm"
                : "bg-background/80 text-muted-foreground ring-1 ring-border/80",
            )}
          >
            {stage}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

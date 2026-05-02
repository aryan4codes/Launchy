import { Settings2 } from "lucide-react";
import { CopyTextButton } from "@/components/CopyTextButton";

export function RunInputsCard({ inputs }: { inputs: Record<string, unknown> }) {
  const entries = Object.entries(inputs);
  if (entries.length === 0) return null;

  const json = JSON.stringify(inputs, null, 2);

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Run inputs
          </h2>
        </div>
        <CopyTextButton text={json} label="Copy" size="sm" variant="ghost" />
      </div>
      <div className="px-5 py-3">
        <div className="grid gap-2">
          {entries.map(([key, val]) => (
            <div
              key={key}
              className="flex items-baseline gap-3 rounded-lg bg-muted/30 px-3 py-2"
            >
              <span className="shrink-0 font-mono text-xs font-medium text-primary">
                {key}
              </span>
              <span className="text-sm text-foreground break-all">
                {typeof val === "string" ? val : JSON.stringify(val)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

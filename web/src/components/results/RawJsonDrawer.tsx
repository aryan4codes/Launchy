import { useState } from "react";
import { ChevronDown, ChevronRight, Code2 } from "lucide-react";
import { CopyTextButton } from "@/components/CopyTextButton";

export function RawJsonDrawer({ payload }: { payload: unknown }) {
  const [open, setOpen] = useState(false);

  let json: string;
  try {
    json = JSON.stringify(payload, null, 2);
  } catch {
    json = String(payload);
  }

  return (
    <details
      className="group rounded-xl border border-border/60 bg-card/50"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Code2 className="h-3.5 w-3.5" />
        Technical: raw run JSON
        <span className="ml-auto">
          <CopyTextButton
            text={json}
            label="Copy JSON"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
          />
        </span>
      </summary>
      <pre className="scrollbar-thin max-h-[50vh] overflow-auto border-t border-border/60 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {json}
      </pre>
    </details>
  );
}

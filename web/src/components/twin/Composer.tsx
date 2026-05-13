import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-2 border-t border-zinc-200/90 bg-zinc-50/80 p-3 dark:border-border dark:bg-card/90",
        className,
      )}
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Message… (Shift+Enter for new line)"
        className="min-h-[52px] flex-1 resize-none rounded-xl border-zinc-200 bg-white text-sm text-zinc-950 placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-zinc-400/30 dark:border-border dark:bg-background dark:text-foreground"
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && value.trim()) onSend();
          }
        }}
      />
      <Button
        type="button"
        size="sm"
        disabled={disabled || !value.trim()}
        className="h-11 w-11 shrink-0 rounded-xl bg-zinc-900 p-0 text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
        onClick={() => onSend()}
      >
        <Send className="h-4 w-4" aria-hidden />
        <span className="sr-only">Send</span>
      </Button>
    </div>
  );
}

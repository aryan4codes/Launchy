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
        "flex gap-2 border-t border-fuchsia-200/60 bg-white/90 p-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.08)] dark:border-border dark:bg-card/95",
        className,
      )}
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask your Twin… (Shift+Enter for newline)"
        className="min-h-[72px] flex-1 resize-none border-fuchsia-200/80 bg-white text-sm text-zinc-950 placeholder:text-zinc-500 focus-visible:ring-fuchsia-300 dark:border-border dark:bg-background dark:text-foreground"
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
        className="h-[72px] shrink-0 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-orange-400 px-5 text-white shadow-lg shadow-rose-400/30 hover:opacity-95 disabled:opacity-50"
        onClick={() => onSend()}
      >
        <Send className="h-4 w-4" aria-hidden />
        <span className="sr-only">Send</span>
      </Button>
    </div>
  );
}

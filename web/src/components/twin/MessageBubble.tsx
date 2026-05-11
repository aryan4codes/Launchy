import { MarkdownProse } from "@/components/MarkdownProse";
import { cn } from "@/lib/utils";

export function MessageBubble({ role, content }: { role: "user" | "twin"; content: string }) {
  const twin = role === "twin";
  return (
    <div className={cn("flex", twin ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[min(560px,90vw)] rounded-[1.25rem] px-4 py-2.5 text-sm shadow-md",
          twin
            ? "border border-white/80 bg-white/95 text-zinc-950 shadow-black/5 ring-1 ring-fuchsia-200/40 dark:border-border dark:bg-card dark:text-foreground dark:ring-border"
            : "bg-gradient-to-br from-fuchsia-500 via-rose-500 to-orange-400 text-white shadow-lg shadow-rose-400/25",
        )}
      >
        {twin ? <MarkdownProse content={content} className="!prose-sm dark:prose-invert prose-p:my-1 prose-headings:text-zinc-900" /> : <p className="whitespace-pre-wrap">{content}</p>}
      </div>
    </div>
  );
}

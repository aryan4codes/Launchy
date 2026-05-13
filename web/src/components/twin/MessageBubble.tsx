import { MarkdownProse } from "@/components/MarkdownProse";
import { cn } from "@/lib/utils";

export function MessageBubble({ role, content }: { role: "user" | "twin"; content: string }) {
  const twin = role === "twin";
  return (
    <div className={cn("flex", twin ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[min(560px,90vw)] rounded-2xl px-4 py-2.5 text-sm",
          twin
            ? "border border-zinc-200/90 bg-white text-zinc-900 shadow-sm dark:border-border dark:bg-card dark:text-foreground"
            : "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950",
        )}
      >
        {twin ? <MarkdownProse content={content} className="!prose-sm dark:prose-invert prose-p:my-1 prose-headings:text-zinc-900" /> : <p className="whitespace-pre-wrap">{content}</p>}
      </div>
    </div>
  );
}

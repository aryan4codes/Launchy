import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownProse({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("prose-result", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href, ...rest }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline break-all"
              {...rest}
            >
              {children}
            </a>
          ),
          table: ({ children, ...rest }) => (
            <div className="-mx-1 my-3 overflow-x-auto px-1">
              <table className="w-full min-w-max border-collapse text-sm" {...rest}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...rest }) => (
            <thead className="border-b-2 border-border bg-muted/50" {...rest}>
              {children}
            </thead>
          ),
          th: ({ children, ...rest }) => (
            <th
              className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              {...rest}
            >
              {children}
            </th>
          ),
          td: ({ children, ...rest }) => (
            <td className="px-3 py-2.5 text-sm text-foreground border-b border-border/50" {...rest}>
              {children}
            </td>
          ),
          tr: ({ children, ...rest }) => (
            <tr className="hover:bg-muted/30 transition-colors" {...rest}>
              {children}
            </tr>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

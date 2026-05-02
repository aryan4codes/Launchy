import { ExternalLink } from "lucide-react";

type SerperResult = {
  title: string;
  link: string;
  snippet: string;
  position: number;
};

type SerperPayload = {
  searchParameters?: { q?: string };
  organic?: SerperResult[];
  peopleAlsoAsk?: { question: string; snippet: string; link: string }[];
  relatedSearches?: { query: string }[];
};

export function tryParseSerperJson(raw: string): SerperPayload | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as SerperPayload;
    if (parsed.organic || parsed.searchParameters) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function SearchResults({ data }: { data: SerperPayload }) {
  const query = data.searchParameters?.q;
  const results = data.organic ?? [];
  const paa = data.peopleAlsoAsk ?? [];

  return (
    <div className="space-y-3">
      {query && (
        <p className="text-sm text-muted-foreground">
          Query: <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <a
              key={r.link}
              href={r.link}
              target="_blank"
              rel="noreferrer"
              className="group block rounded-lg border border-border/60 bg-background px-3.5 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-primary group-hover:underline">
                    {r.title}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground truncate">
                    {new URL(r.link).hostname}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-foreground/80">
                    {r.snippet}
                  </p>
                </div>
                <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </a>
          ))}
        </div>
      )}

      {paa.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            People also ask
          </p>
          <div className="space-y-1.5">
            {paa.map((q) => (
              <div
                key={q.question}
                className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
              >
                <p className="text-sm font-medium text-foreground">{q.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">{q.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

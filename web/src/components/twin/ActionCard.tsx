import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { workflowRunWebSocketUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function ActionCard({
  runId,
  resultsUrl,
  templateId,
}: {
  runId: string;
  resultsUrl: string;
  templateId?: string;
}) {
  const [status, setStatus] = useState<string>("starting");

  useEffect(() => {
    const ws = new WebSocket(workflowRunWebSocketUrl(runId));
    ws.onmessage = (evt) => {
      try {
        const d = JSON.parse(evt.data as string) as { type?: string };
        if (d.type === "sync" || d.type === "run_finished") {
          setStatus("done");
          ws.close();
        }
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      /* no-op */
    };
    ws.onerror = () => setStatus("error");
    return () => ws.close();
  }, [runId]);

  return (
    <div className="max-w-md rounded-xl border border-border bg-muted/40 p-3 text-xs shadow-inner">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="muted">{status}</Badge>
        {templateId ? <span className="font-mono text-muted-foreground">{templateId}</span> : null}
      </div>
      <p className="mt-2 font-mono text-[11px] text-foreground">{runId}</p>
      <div className="mt-3 flex gap-2">
        <Button asChild size="sm" variant="default">
          <Link to={resultsUrl}>View results</Link>
        </Button>
      </div>
    </div>
  );
}

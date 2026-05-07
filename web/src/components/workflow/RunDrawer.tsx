import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

import { HorizontalRunProgress } from '@/components/workflow/HorizontalRunProgress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { NodeRunUi } from '@/components/workflow/runUi'
import { artifactUrl, imageUrlsFromRunPayload, parseRunMeta } from '@/lib/runPayloadDisplay'
import { cn } from '@/lib/utils'

export function RunDrawer({
  expanded,
  onToggleExpanded,
  runLogText,
  runPayload,
  nodeIdsOrdered,
  nodeTypesById,
  nodeRunUi,
  busy,
  inputsSlot,
  className,
}: {
  expanded: boolean
  onToggleExpanded: () => void
  runLogText: string
  runPayload: unknown
  /** topological execution order ids */
  nodeIdsOrdered: string[]
  nodeTypesById: Record<string, string>
  nodeRunUi: Record<string, NodeRunUi>
  busy: boolean
  inputsSlot: ReactNode
  className?: string
}) {
  const imgs = useMemo(() => imageUrlsFromRunPayload(runPayload), [runPayload])
  const meta = parseRunMeta(runPayload)
  const [showTechnical, setShowTechnical] = useState(false)

  return (
    <div
      className={cn(
        'relative z-10 shrink-0 border-t border-border bg-card/96 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] backdrop-blur-lg transition-[max-height] duration-300 ease-out dark:shadow-[0_-10px_40px_rgba(0,0,0,0.45]',
        expanded ? 'max-h-[min(52vh,420px)]' : 'max-h-[148px]',
        className,
      )}
    >
      <div className="flex flex-col gap-1 border-b border-border/60 px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1 px-2" type="button" onClick={onToggleExpanded}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="text-xs font-medium">Progress</span>
          </Button>
          {busy ? (
            <Badge variant="outline" className="shrink-0 animate-pulse border-primary/35 text-[10px] normal-case">
              Running
            </Badge>
          ) : meta.status ? (
            <Badge variant="outline" className="text-[10px] normal-case">
              {meta.status}
            </Badge>
          ) : null}
          {meta.error ? (
            <span className="max-w-[min(280px,50vw)] truncate text-[11px] text-destructive" title={meta.error}>
              {meta.error}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!busy && meta.runId && (meta.status === 'completed' || meta.status === 'failed') ? (
            <>
              <Link
                to={`/campaigns/${encodeURIComponent(meta.runId)}`}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-primary/45 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                Open campaign
              </Link>
              <Link
                to={`/results/${encodeURIComponent(meta.runId)}`}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-emerald-600/45 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-500/20 dark:border-emerald-500/40 dark:bg-emerald-950/55 dark:text-emerald-50 dark:hover:bg-emerald-900/60"
              >
                View results
              </Link>
            </>
          ) : null}
          {imgs.slice(0, 4).map((url) => (
            <img
              key={url}
              src={artifactUrl(url)}
              alt=""
              className="h-8 w-8 rounded-md border border-border object-cover shadow-sm"
            />
          ))}
          {imgs.length > 4 ? (
            <span className="self-center text-[10px] text-muted-foreground">+{imgs.length - 4}</span>
          ) : null}
        </div>
      </div>

      <HorizontalRunProgress
        nodeIdsOrdered={nodeIdsOrdered}
        nodeTypesById={nodeTypesById}
        nodeRunUi={nodeRunUi}
        busy={busy}
      />

      {expanded ? (
        <div className="scrollbar-thin max-h-[min(36vh,280px)] space-y-3 overflow-y-auto border-t border-border/50 px-3 py-3">
          <div>
            <div className="text-[11px] font-semibold text-foreground">Run inputs</div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Optional overrides for placeholders; your Topic on the canvas is usually enough.
            </p>
            <div className="mt-2">{inputsSlot}</div>
          </div>

          {imgs.length ? (
            <div>
              <div className="text-[11px] font-semibold text-foreground">Images from this run</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {imgs.map((u) => (
                  <a key={u} href={artifactUrl(u)} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={artifactUrl(u)}
                      alt=""
                      className="max-h-32 rounded-lg border border-border object-cover shadow-md"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <Separator className="opacity-40" />

          <button
            type="button"
            onClick={() => setShowTechnical((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left text-[11px] font-medium hover:bg-muted/50"
          >
            Technical details
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', showTechnical && 'rotate-180')}
              aria-hidden
            />
          </button>
          {showTechnical ? (
            <div className="space-y-2 pb-2">
              <pre className="scrollbar-thin max-h-32 overflow-auto rounded-lg border border-border bg-background p-2 font-mono text-[10px] text-muted-foreground">
                {runLogText.trim() ? runLogText : 'No events yet.'}
              </pre>
              <pre className="scrollbar-thin max-h-40 overflow-auto rounded-lg border border-border bg-background p-2 font-mono text-[10px] text-foreground/90">
                {(() => {
                  try {
                    return JSON.stringify(runPayload ?? null, null, 2).slice(0, 9000)
                  } catch {
                    return String(runPayload)
                  }
                })()}
                {runPayload && JSON.stringify(runPayload).length > 9000 ? '\n…' : ''}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

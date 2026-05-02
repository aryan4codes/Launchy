import { ChevronDown, ChevronUp, Circle, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Edge } from 'reactflow'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getCatalogEntry } from '@/lib/nodeCatalog'
import { topologicalOrder } from '@/lib/topological'
import type { NodeRunUi } from '@/components/workflow/runUi'
import { artifactUrl, imageUrlsFromRunPayload, parseRunMeta } from '@/lib/runPayloadDisplay'
import { cn } from '@/lib/utils'

function NodeDot({ status }: { status: NonNullable<NodeRunUi['status']> | 'idle' | 'queued' }) {
  if (status === 'running') return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-400" />
  if (status === 'done') return <Circle className="h-4 w-4 shrink-0 fill-emerald-500 text-emerald-500" />
  if (status === 'failed') return <Circle className="h-4 w-4 shrink-0 fill-red-500 text-red-500" />
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/70" />
}

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

  const [tab, setTab] = useState<'timeline' | 'inputs' | 'events'>('timeline')

  return (
    <div
      className={cn(
        'relative z-10 shrink-0 border-t border-border bg-card/95 shadow-[0_-8px_28px_rgba(0,0,0,0.28)] backdrop-blur-md transition-[max-height]',
        expanded ? 'max-h-[min(42vh,300px)]' : 'max-h-11',
        className,
      )}
    >
      <div className="flex h-11 items-center justify-between gap-2 border-b border-border/60 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1 px-2" type="button" onClick={onToggleExpanded}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            Run console
          </Button>
          {busy ? (
            <Badge variant="outline" className="shrink-0 animate-pulse text-[10px] normal-case">
              Running…
            </Badge>
          ) : meta.status ? (
            <Badge variant="outline" className="text-[10px] normal-case">
              Status: {meta.status}
            </Badge>
          ) : null}
          {meta.error ? (
            <span className="truncate text-[11px] text-red-400" title={meta.error}>
              {meta.error}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!busy && meta.runId && (meta.status === 'completed' || meta.status === 'failed') ? (
            <Link
              to={`results/${encodeURIComponent(meta.runId)}`}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-emerald-600/40 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 dark:border-emerald-600/50 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/70"
            >
              Show results
            </Link>
          ) : null}
          {imgs.slice(0, 3).map((url) => (
            <img
              key={url}
              src={artifactUrl(url)}
              alt=""
              className="h-8 w-8 rounded-md border border-border object-cover"
            />
          ))}
          {imgs.length > 3 ? (
            <span className="self-center text-[10px] text-muted-foreground">+{imgs.length - 3}</span>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="grid min-h-[180px] max-h-[min(36vh,240px)] grid-cols-[minmax(0,280px)_1fr] gap-0">
          <div className="flex min-h-0 flex-col border-r border-border/60 bg-muted/20">
            <div className="grid grid-cols-3 gap-1 border-b border-border/60 px-2 py-1">
              <Button
                type="button"
                size="sm"
                variant={tab === 'timeline' ? 'secondary' : 'ghost'}
                className="h-7 text-xs"
                onClick={() => setTab('timeline')}
              >
                Timeline
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tab === 'inputs' ? 'secondary' : 'ghost'}
                className="h-7 text-xs"
                onClick={() => setTab('inputs')}
              >
                Inputs
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tab === 'events' ? 'secondary' : 'ghost'}
                className="h-7 text-xs"
                onClick={() => setTab('events')}
              >
                Events
              </Button>
            </div>
            {tab === 'timeline' ? (
              <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
                {nodeIdsOrdered.length === 0 ? (
                  <p className="px-2 text-[11px] text-muted-foreground">Add blocks to preview execution order.</p>
                ) : (
                  nodeIdsOrdered.map((nid) => {
                    const st = nodeRunUi[nid]?.status ?? 'idle'
                    const wfType = nodeTypesById[nid] ?? '?'
                    const cat = getCatalogEntry(wfType)
                    const err = nodeRunUi[nid]?.error
                    return (
                      <div
                        key={nid}
                        className={cn(
                          'flex items-center gap-2 rounded-md border px-2 py-1.5',
                          st === 'running'
                            ? 'border-sky-500/35 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-950/40'
                            : 'border-border bg-card/30',
                          st === 'failed'
                            ? 'border-red-400/35 bg-red-50 dark:border-red-500/30 dark:bg-red-950/25'
                            : null,
                          st === 'done'
                            ? 'border-emerald-500/35 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-950/20'
                            : null,
                        )}
                      >
                        <NodeDot status={st} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-[11px] text-foreground">{nid}</div>
                          <div className="truncate text-[10px] text-muted-foreground">{cat.short}</div>
                          {err ? <div className="truncate pt-0.5 text-[10px] text-red-400">{err}</div> : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : tab === 'inputs' ? (
              <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-2">
                <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                  These merge into workflow inputs consumed by{' '}
                  <span className="font-mono text-foreground">trigger.input</span> and Jinja placeholders.
                </p>
                {inputsSlot}
              </div>
            ) : (
              <pre className="scrollbar-thin flex-1 overflow-auto p-3 text-[10px] leading-relaxed text-muted-foreground">
                {runLogText.trim() ? runLogText : 'Listening for websocket events…'}
              </pre>
            )}
          </div>

          <div className="scrollbar-thin min-h-0 overflow-y-auto p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Final payload</div>
            {imgs.length ? (
              <div className="mt-2 flex flex-wrap gap-3">
                {imgs.map((u) => (
                  <a key={u} href={artifactUrl(u)} target="_blank" rel="noreferrer" className="block">
                    <img src={artifactUrl(u)} alt="generated" className="max-h-40 rounded-lg border border-border shadow-md" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-muted-foreground">No image outputs detected in payload.</p>
            )}
            <Separator className="my-3 opacity-50" />
            <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-background p-2 font-mono text-[10px] text-foreground/90">
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
        </div>
      ) : null}
    </div>
  )
}

export function deriveNodeExecOrder(ids: string[], edges: Edge[]): string[] {
  const o = topologicalOrder(ids, edges)
  return o.length ? o : [...ids]
}

import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
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

function StepConnector({ active }: { active: boolean }) {
  return (
    <div
      className="relative mx-0.5 h-0.5 w-5 shrink-0 overflow-hidden rounded-full bg-border sm:w-7"
      aria-hidden
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/15 via-primary to-primary/70 transition-all duration-500 ease-out',
          active ? 'w-full opacity-90' : 'w-0 opacity-0',
        )}
      />
      {active ? (
        <div className="run-connector-shimmer absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/55 to-transparent" />
      ) : null}
    </div>
  )
}

function HorizontalRunProgress({
  nodeIdsOrdered,
  nodeTypesById,
  nodeRunUi,
  busy,
}: {
  nodeIdsOrdered: string[]
  nodeTypesById: Record<string, string>
  nodeRunUi: Record<string, NodeRunUi>
  busy: boolean
}) {
  if (nodeIdsOrdered.length === 0) {
    return (
      <p className="py-2 text-center text-[11px] text-muted-foreground">
        Add blocks to the canvas to see run progress here.
      </p>
    )
  }

  return (
    <div className="scrollbar-thin flex items-stretch gap-0 overflow-x-auto px-1 py-2 pb-1 sm:px-2">
      {nodeIdsOrdered.map((nid, i) => {
        const st = nodeRunUi[nid]?.status ?? 'idle'
        const wfType = nodeTypesById[nid] ?? '?'
        const cat = getCatalogEntry(wfType)
        const Icon = cat.icon
        const err = nodeRunUi[nid]?.error
        const prevId = i > 0 ? nodeIdsOrdered[i - 1] : undefined
        const prevDone = prevId ? nodeRunUi[prevId]?.status === 'done' : false
        const connectorGlow = Boolean(i > 0 && busy && prevDone && st === 'running')

        return (
          <div key={nid} className="flex shrink-0 items-center">
            {i > 0 ? <StepConnector active={connectorGlow} /> : null}
            <div
              className={cn(
                'flex min-w-[4.75rem] max-w-[110px] flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center shadow-sm transition-all duration-300 sm:min-w-[5.25rem]',
                st === 'running' &&
                  'scale-[1.02] border-primary/50 bg-gradient-to-b from-primary/15 to-background ring-2 ring-primary/35 dark:ring-primary/25',
                st === 'done' && 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/30',
                st === 'failed' && 'border-destructive/50 bg-destructive/10',
                st === 'idle' && 'border-border/70 bg-muted/30 opacity-85',
              )}
              title={err ?? cat.label}
            >
              <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border bg-background/90">
                {st === 'running' ? (
                  <>
                    <span className="absolute inset-0 animate-pulse rounded-lg bg-primary/20" aria-hidden />
                    <Loader2 className="relative h-4 w-4 animate-spin text-primary" aria-hidden />
                  </>
                ) : st === 'done' ? (
                  <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                ) : st === 'failed' ? (
                  <Icon className="h-4 w-4 text-destructive" aria-hidden />
                ) : (
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                )}
              </span>
              <span className="w-full truncate text-[10px] font-semibold leading-tight text-foreground">{nid}</span>
              <span className="line-clamp-2 w-full text-[9px] leading-snug text-muted-foreground">{cat.short}</span>
              {err ? <span className="line-clamp-2 w-full text-[9px] text-destructive">{err}</span> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
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
            <Link
              to={`results/${encodeURIComponent(meta.runId)}`}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-emerald-600/45 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-500/20 dark:border-emerald-500/40 dark:bg-emerald-950/55 dark:text-emerald-50 dark:hover:bg-emerald-900/60"
            >
              View results
            </Link>
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

export function deriveNodeExecOrder(ids: string[], edges: Edge[]): string[] {
  const o = topologicalOrder(ids, edges)
  return o.length ? o : [...ids]
}

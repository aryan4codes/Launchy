import { Loader2 } from 'lucide-react'
import type { Edge } from 'reactflow'

import { getCatalogEntry } from '@/lib/nodeCatalog'
import { topologicalOrder } from '@/lib/topological'
import type { NodeRunUi } from '@/components/workflow/runUi'
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

export function HorizontalRunProgress({
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
        Run metadata has no workflow graph yet. Progress will appear shortly.
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

export function deriveNodeExecOrder(ids: string[], edges: Edge[]): string[] {
  const o = topologicalOrder(ids, edges)
  return o.length ? o : [...ids]
}

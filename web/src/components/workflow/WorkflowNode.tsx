import { Loader2 } from 'lucide-react'
import { memo } from 'react'
import { Handle, type NodeProps, Position } from 'reactflow'

import { Badge } from '@/components/ui/badge'
import { CATEGORY_META, getCatalogEntry } from '@/lib/nodeCatalog'
import { cn } from '@/lib/utils'

import { useRunUi } from './runUi'

export type WorkflowNodeData = {
  wfType: string
  label?: string
} & Record<string, unknown>

export const WorkflowNodeInner = memo(({ id, data, selected }: NodeProps<WorkflowNodeData>) => {
  const wfType = data.wfType ?? 'unknown'
  const cat = getCatalogEntry(wfType)
  const meta = CATEGORY_META[cat.category]
  const Icon = cat.icon
  const runUi = useRunUi(id)
  const status = runUi?.status ?? 'idle'

  const previewParts: string[] = []
  const pkeys = cat.previewKeys ?? []
  for (const pk of pkeys) {
    const v = data[pk]
    if (v === undefined || v === null) continue
    const s = typeof v === 'string' ? v : JSON.stringify(v)
    if (s.length > 48) previewParts.push(`${pk}: ${s.slice(0, 45)}…`)
    else previewParts.push(`${pk}: ${s}`)
  }

  const statusUi = (() => {
    if (status === 'running')
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-sky-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </span>
      )
    if (status === 'done')
      return <span className="text-[10px] font-medium text-emerald-400">Done</span>
    if (status === 'failed')
      return <span className="text-[10px] font-medium text-red-400">Failed</span>
    return null
  })()

  return (
    <div
      className={cn(
        'relative min-w-[200px] max-w-[240px] rounded-xl border bg-gradient-to-br from-card to-card/80 p-[1px]',
        'shadow-lg shadow-black/20',
        meta.ring,
        selected && 'ring-2 ring-offset-2 ring-offset-background',
        selected ? meta.ring : 'ring-1',
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-[11px] bg-card/95 px-3 pb-2.5 pt-2 text-left backdrop-blur-sm',
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40',
            meta.tint,
          )}
        />

        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border !border-border !bg-muted dark:!border-muted-foreground/50 dark:!bg-muted-foreground/20"
        />

        <div className="relative flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background/80',
                meta.chip,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                {cat.label}
              </div>
              <div className="font-mono text-xs text-foreground truncate" title={id}>
                {id}
              </div>
            </div>
          </div>
          {statusUi}
        </div>

        <p className="relative mt-2 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{cat.short}</p>

        {previewParts.length ? (
          <div className="relative mt-2 space-y-0.5 border-t border-border/60 pt-2">
            {previewParts.map((line) => (
              <div key={line} className="truncate font-mono text-[10px] text-muted-foreground" title={line}>
                {line}
              </div>
            ))}
          </div>
        ) : null}

        <div className="relative mt-2 flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[9px] normal-case">
            {wfType}
          </Badge>
          {cat.category !== 'transform' ? (
            <Badge variant="muted" className="text-[9px] normal-case">
              {meta.label}
            </Badge>
          ) : null}
        </div>

        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border !border-border !bg-muted dark:!border-muted-foreground/50 dark:!bg-muted-foreground/20"
        />
      </div>
    </div>
  )
})
WorkflowNodeInner.displayName = 'WorkflowNodeInner'

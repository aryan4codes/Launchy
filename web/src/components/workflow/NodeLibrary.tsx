import { GripVertical } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CATEGORY_META, getCatalogEntry, groupCatalog } from '@/lib/nodeCatalog'
import { cn } from '@/lib/utils'

const DND_MIME = 'application/vnd.avcm.node-type'

export function NodeLibrary({
  onAdd,
  className,
}: {
  onAdd: (wfType: string) => void
  className?: string
}) {
  const groups = groupCatalog()

  const onDragStart = (e: React.DragEvent, wfType: string) => {
    e.dataTransfer.setData(DND_MIME, wfType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col border-b border-border bg-card/40 backdrop-blur-md sm:w-[260px] xl:w-[260px] xl:border-b-0 xl:border-r',
        className,
      )}
    >
      <div className="border-b border-border px-3 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Blocks</h2>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Drag onto the canvas or click to insert. Wire outputs → inputs left to right.
        </p>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {groups.map(({ category, entries }) => {
          const cm = CATEGORY_META[category]
          return (
            <div key={category} className="mb-4">
              <div
                className={cn(
                  'mb-1.5 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground',
                )}
              >
                <span className={cn('h-px flex-1 bg-gradient-to-r from-transparent to-border')} />
                <span>{cm.label}</span>
                <span className={cn('h-px flex-1 bg-gradient-to-l from-transparent to-border')} />
              </div>
              <div className="space-y-1">
                {entries.map((entry) => {
                  const Icon = entry.icon
                  const meta = CATEGORY_META[entry.category]
                  return (
                    <div key={entry.type} className="group rounded-lg border border-transparent hover:border-border/80">
                      <Button
                        type="button"
                        variant="ghost"
                        draggable
                        onDragStart={(e) => onDragStart(e, entry.type)}
                        className={cn(
                          'h-auto w-full justify-start gap-2 px-2 py-2 text-left hover:bg-accent/60',
                          'border border-border/0 hover:border-border/60',
                        )}
                        onClick={() => onAdd(entry.type)}
                      >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background', meta.chip)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold leading-tight text-foreground truncate">
                            {entry.label}
                          </span>
                          <span className="mt-0.5 block line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                            {entry.short}
                          </span>
                        </span>
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        <Separator className="my-2 opacity-50" />
        <p className="px-1 pb-4 text-[10px] leading-relaxed text-muted-foreground">
          Tip: start from <strong className="text-foreground">{getCatalogEntry('trigger.input').label}</strong>{' '}
          on the left—then connect signals and agents upstream → downstream toward your output collector.
        </p>
      </div>
    </aside>
  )
}

export function readDraggedNodeType(dt: DataTransfer): string | null {
  const v = dt.getData(DND_MIME)
  return v || null
}

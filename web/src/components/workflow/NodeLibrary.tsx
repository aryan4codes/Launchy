import { useState } from 'react'
import { ChevronDown, ChevronRight, FileStack, GripVertical, Layers } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CATEGORY_META, getCatalogEntry, groupCatalog, partitionTemplateIds, templateMeta } from '@/lib/nodeCatalog'
import { cn } from '@/lib/utils'

const DND_MIME = 'application/vnd.launchy.node-type'

function TemplateSidebarCard({
  tid,
  busy,
  onClone,
}: {
  tid: string
  busy: boolean
  onClone: (id: string) => void
}) {
  const m = templateMeta(tid)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onClone(tid)}
      className={cn(
        'w-full rounded-lg border border-border/70 bg-muted/30 px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-accent/60',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span className="truncate text-xs font-semibold text-foreground">{m.label}</span>
        {m.badge ? (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/15 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-primary">
            {m.badge}
          </span>
        ) : null}
      </div>
      <span className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{m.description}</span>
    </button>
  )
}

export function NodeLibrary({
  onAdd,
  templates,
  onCloneTemplate,
  busy,
  initialBlocksCollapsed,
  className,
}: {
  onAdd: (wfType: string) => void
  templates: string[]
  onCloneTemplate: (id: string) => void
  busy: boolean
  /** When true (empty canvas), blocks start collapsed below Templates. */
  initialBlocksCollapsed: boolean
  className?: string
}) {
  const groups = groupCatalog()
  const { general: generalTemplates, usecase: usecaseTemplates } = partitionTemplateIds(templates)
  const [templatesOpen, setTemplatesOpen] = useState(true)
  const [blocksOpen, setBlocksOpen] = useState(!initialBlocksCollapsed)

  const onDragStart = (e: React.DragEvent, wfType: string) => {
    e.dataTransfer.setData(DND_MIME, wfType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside
      className={cn(
        'pointer-events-none fixed left-2 top-[calc(4rem+env(safe-area-inset-top,0px))] z-[38] sm:left-3',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-auto flex max-h-[calc(100dvh-6.25rem)] w-[min(272px,calc(100vw-1rem))] flex-col overflow-hidden',
          'rounded-2xl border border-border/75 bg-card/90 shadow-2xl shadow-black/15 backdrop-blur-xl',
          'dark:border-white/10 dark:bg-card/88 dark:shadow-black/40',
        )}
      >
      <div className="shrink-0 border-b border-border">
        <button
          type="button"
          aria-expanded={templatesOpen}
          onClick={() => setTemplatesOpen((o) => !o)}
          className="flex w-full items-center gap-2 border-b border-border/60 bg-card/60 px-3 py-2.5 text-left hover:bg-accent/40"
        >
          {templatesOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FileStack className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Templates</h2>
              <p className="truncate text-[10px] text-muted-foreground">
                Clone a pipeline · set topic on first block · run
              </p>
            </div>
          </div>
        </button>

        {templatesOpen ? (
          <div className="scrollbar-thin max-h-[min(38vh,380px)] overflow-y-auto px-2 py-2 xl:max-h-[min(42vh,440px)]">
            <div className="space-y-3">
              <section>
                <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  General
                </div>
                <div className="space-y-1.5">
                  {generalTemplates.map((tid) => (
                    <TemplateSidebarCard key={tid} tid={tid} busy={busy} onClone={onCloneTemplate} />
                  ))}
                  {generalTemplates.length === 0 ? (
                    <p className="px-1 text-[10px] text-muted-foreground">No general templates loaded.</p>
                  ) : null}
                </div>
              </section>
              <section className="border-t border-border pt-3">
                <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Use-case ready
                </div>
                <div className="space-y-1.5">
                  {usecaseTemplates.map((tid) => (
                    <TemplateSidebarCard key={tid} tid={tid} busy={busy} onClone={onCloneTemplate} />
                  ))}
                  {usecaseTemplates.length === 0 ? (
                    <p className="px-1 text-[10px] text-muted-foreground">No use-case templates on disk.</p>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border xl:border-b-0">
        <button
          type="button"
          aria-expanded={blocksOpen}
          onClick={() => setBlocksOpen((o) => !o)}
          className="flex w-full shrink-0 items-center gap-2 border-b border-border/60 bg-card/60 px-3 py-2.5 text-left hover:bg-accent/40"
        >
          {blocksOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Layers className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Blocks</h2>
              <p className="truncate text-[10px] text-muted-foreground">
                Drag nodes onto the canvas or click to insert
              </p>
            </div>
          </div>
        </button>

        {blocksOpen ? (
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
                            <span
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background',
                                meta.chip,
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold leading-tight text-foreground">
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
              Tip: start from <strong className="text-foreground">{getCatalogEntry('trigger.input').label}</strong> — then wire
              left → right toward your output collector.
            </p>
          </div>
        ) : null}
      </div>
      </div>
    </aside>
  )
}

export function readDraggedNodeType(dt: DataTransfer): string | null {
  const v = dt.getData(DND_MIME)
  return v || null
}

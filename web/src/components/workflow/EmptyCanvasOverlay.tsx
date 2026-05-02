import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { partitionTemplateIds, templateMeta } from '@/lib/nodeCatalog'
import { cn } from '@/lib/utils'

function TemplatePickButton({
  tid,
  busy,
  variant,
  onPick,
}: {
  tid: string
  busy: boolean
  variant: 'general' | 'usecase'
  onPick: () => void
}) {
  const m = templateMeta(tid)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      title={m.description}
      onClick={onPick}
      className={cn(
        'h-auto min-h-[3.25rem] w-full justify-start rounded-lg px-3 py-2.5 text-left sm:min-h-[3.5rem]',
        variant === 'general' ? 'border-emerald-500/30 hover:bg-emerald-500/5' : 'border-violet-500/30 hover:bg-violet-500/5',
      )}
    >
      <span className="block text-[11px] font-semibold leading-snug">{m.label}</span>
      <span className="mt-0.5 block line-clamp-2 text-[10px] font-normal leading-snug text-muted-foreground sm:line-clamp-2">
        {m.description}
      </span>
      {m.badge ? (
        <span className="mt-1.5 inline-block w-fit rounded-full bg-primary/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
          {m.badge}
        </span>
      ) : null}
    </Button>
  )
}

export function EmptyCanvasOverlay({
  templates,
  onCloneTemplate,
  busy,
}: {
  templates: string[]
  onCloneTemplate: (id: string) => void
  busy: boolean
}) {
  const { general: generalTemplates, usecase: usecaseTemplates } = partitionTemplateIds(templates)

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-20 overflow-y-auto overscroll-contain bg-background/55 backdrop-blur-[3px]',
        'flex flex-col items-stretch justify-start p-3 sm:items-center sm:justify-center sm:p-5 md:p-6',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto relative my-2 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl ring-1 ring-border/60',
          'sm:my-auto sm:max-h-[min(calc(100dvh-5rem),640px)] sm:rounded-2xl md:max-w-xl',
          'flex max-h-none min-h-0 flex-col sm:max-h-[min(calc(100dvh-4.5rem),680px)]',
        )}
      >
        <span className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full bg-emerald-500/20 blur-3xl sm:-right-6 sm:-top-6 sm:h-32 sm:w-32" />
        <span className="pointer-events-none absolute -bottom-10 -left-8 h-36 w-36 rounded-full bg-violet-500/15 blur-3xl sm:-bottom-12 sm:-left-10 sm:h-40 sm:w-40" />

        <div className="relative flex min-h-0 flex-col p-4 sm:p-6">
          <div className="inline-flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-sm font-semibold tracking-tight">Start from inspiration</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-3">
            Clone a template for a full pipeline, or expand <strong className="text-foreground">Blocks</strong> in the
            sidebar. Set your topic on the first step, then <strong className="text-foreground">Run</strong>.
          </p>

          <Separator className="my-4 opacity-50 sm:my-5" />

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 scrollbar-thin">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Templates</div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">General</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {generalTemplates.map((tid) => (
                  <TemplatePickButton
                    key={tid}
                    tid={tid}
                    busy={busy}
                    variant="general"
                    onPick={() => onCloneTemplate(tid)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Use-case ready
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {usecaseTemplates.map((tid) => (
                  <TemplatePickButton
                    key={tid}
                    tid={tid}
                    busy={busy}
                    variant="usecase"
                    onPick={() => onCloneTemplate(tid)}
                  />
                ))}
              </div>
              {templates.length === 0 ? (
                <p className="text-xs text-muted-foreground">Backend returned no workflow templates.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { templateMeta } from '@/lib/nodeCatalog'
import { cn } from '@/lib/utils'

export function EmptyCanvasOverlay({
  templates,
  onCloneTemplate,
  busy,
}: {
  templates: string[]
  onCloneTemplate: (id: string) => void
  busy: boolean
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/55 p-6 backdrop-blur-[3px]">
      <div
        className={cn(
          'pointer-events-auto relative w-full max-w-lg rounded-2xl border border-white/10 bg-card/95 p-6 shadow-2xl shadow-black/50',
          'ring-1 ring-white/10',
        )}
      >
        <span className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />
        <span className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden />
            <span className="text-sm font-semibold tracking-tight">Start from inspiration</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Clone a template to get a full marketing pipeline, or drag blocks from the left library. Connect left →
            right, fill the forms, then hit <strong className="text-foreground">Run</strong>.
          </p>

          <Separator className="my-5 opacity-50" />

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Templates</div>
            <div className="flex flex-wrap gap-2">
              {(templates.slice(0, 4)).map((tid) => {
                const m = templateMeta(tid)
                return (
                  <Button
                    key={tid}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    className="h-auto rounded-lg border-emerald-500/30 px-4 py-2 text-left"
                    title={m.description}
                    onClick={() => onCloneTemplate(tid)}
                  >
                    <span className="block text-[11px] font-semibold">{m.label}</span>
                  </Button>
                )
              })}
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

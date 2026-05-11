import { ArrowRight, Sparkles } from 'lucide-react'

import { LaunchyFlowExplainer } from '@/components/LaunchyFlowExplainer'
import { Separator } from '@/components/ui/separator'
import { partitionTemplateIds, templateMeta } from '@/lib/nodeCatalog'
import { cn } from '@/lib/utils'

function TemplateCard({
  tid,
  busy,
  accent,
  onPick,
}: {
  tid: string
  busy: boolean
  accent: 'emerald' | 'violet'
  onPick: () => void
}) {
  const m = templateMeta(tid)
  const blurb = m.tagline ?? m.description

  return (
    <button
      type="button"
      disabled={busy}
      title={m.description}
      onClick={onPick}
      className={cn(
        'group relative flex w-full rounded-xl border bg-card px-4 py-3.5 text-left shadow-sm outline-none ring-offset-background transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        accent === 'emerald' &&
          'border-emerald-500/25 hover:border-emerald-500/45 hover:bg-emerald-500/[0.04] dark:border-emerald-500/20 dark:hover:bg-emerald-500/[0.06]',
        accent === 'violet' &&
          'border-violet-500/25 hover:border-violet-500/45 hover:bg-violet-500/[0.04] dark:border-violet-500/20 dark:hover:bg-violet-500/[0.06]',
      )}
    >
      {m.badge ? (
        <span className="absolute right-3 top-2.5 rounded-full bg-primary/14 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          {m.badge}
        </span>
      ) : null}
      <div className={cn('min-w-0 flex-1 pr-8', m.badge && 'pr-[4.75rem]')}>
        <span className="block text-[15px] font-semibold leading-snug tracking-tight text-foreground">{m.label}</span>
        <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground line-clamp-2">{blurb}</p>
      </div>
      <ArrowRight
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary/80"
        aria-hidden
      />
    </button>
  )
}

function TemplateSectionHeading({
  children,
  accent,
}: {
  children: React.ReactNode
  accent: 'emerald' | 'violet'
}) {
  const from =
    accent === 'emerald' ? 'from-emerald-600/35 via-transparent' : 'from-violet-600/35 via-transparent'
  const toDot = accent === 'emerald' ? 'bg-emerald-600' : 'bg-violet-600'

  return (
    <div className="flex items-center gap-3 pb-2 pt-1">
      <span className={cn('h-px min-w-[1rem] flex-1 bg-gradient-to-r', from, 'to-transparent')} />
      <span
        className={cn(
          'shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
          accent === 'emerald'
            ? 'bg-emerald-500/10 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100'
            : 'bg-violet-500/10 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100',
        )}
      >
        {children}
      </span>
      <span className={cn('h-2 w-2 shrink-0 rounded-full opacity-75', toDot)} aria-hidden />
      <span className={cn('h-px flex-1 bg-gradient-to-l', from, 'to-transparent')} />
    </div>
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
        'pointer-events-none absolute inset-0 z-20 overflow-y-auto overscroll-contain bg-background/50 backdrop-blur-[2px]',
        'flex flex-col items-stretch justify-start px-3 py-4 sm:items-center sm:justify-center sm:px-5 sm:py-6 md:px-8',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto relative w-full max-w-lg rounded-2xl border border-border/80 bg-card/98 shadow-2xl ring-1 ring-border/40',
          'sm:max-w-2xl sm:rounded-3xl md:max-w-[42rem]',
          'my-2 flex max-h-none min-h-0 flex-col sm:my-auto sm:max-h-[min(calc(100dvh-5rem),720px)]',
        )}
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-500/10" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-44 w-44 rounded-full bg-violet-500/12 blur-3xl dark:bg-violet-500/10" />

        <div className="relative flex min-h-0 flex-col gap-5 px-5 py-6 sm:gap-6 sm:px-8 sm:py-8">
          <header className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center justify-center gap-2 text-primary sm:justify-start">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 dark:bg-primary/20">
                <Sparkles className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="text-base font-semibold tracking-tight sm:text-lg">Start from inspiration</span>
            </div>
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Pick a starter workflow, or drag from <strong className="font-medium text-foreground">Blocks</strong> on
              the left. Enter your topic on the first step, then <strong className="font-medium text-foreground">Run</strong>.
            </p>
            <div className="pt-4 text-left">
              <LaunchyFlowExplainer variant="compact" className="max-w-none bg-card/80" />
            </div>
          </header>

          <Separator className="opacity-60" />

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-0.5 scrollbar-thin sm:space-y-8">
            <section>
              <TemplateSectionHeading accent="emerald">General starters</TemplateSectionHeading>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                {generalTemplates.map((tid) => (
                  <TemplateCard key={tid} tid={tid} busy={busy} accent="emerald" onPick={() => onCloneTemplate(tid)} />
                ))}
              </div>
              {generalTemplates.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No general templates loaded.</p>
              ) : null}
            </section>

            <section className="border-t border-border/70 pt-6 sm:pt-8">
              <TemplateSectionHeading accent="violet">Use-case presets</TemplateSectionHeading>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                {usecaseTemplates.map((tid) => (
                  <TemplateCard key={tid} tid={tid} busy={busy} accent="violet" onPick={() => onCloneTemplate(tid)} />
                ))}
              </div>
              {templates.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No templates available from the server.</p>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

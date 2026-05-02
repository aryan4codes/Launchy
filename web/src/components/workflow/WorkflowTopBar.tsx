import { Loader2, Menu, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  usePopover,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'
import { templateMeta } from '@/lib/nodeCatalog'
import { cn } from '@/lib/utils'

const outlineBtn =
  'inline-flex h-9 items-center gap-2 rounded-md border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50'

function TemplatesMenuBtn({
  busy,
  templates,
  onCloneTemplate,
}: {
  busy: boolean
  templates: string[]
  onCloneTemplate: (id: string) => void
}) {
  return (
    <Popover>
      <PopoverAnchor>
        <PopoverTrigger className={outlineBtn} disabled={busy}>
          <Menu className="h-4 w-4 shrink-0" aria-hidden />
          Templates
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <TemplateListInner busy={busy} templates={templates} onCloneTemplate={onCloneTemplate} />
        </PopoverContent>
      </PopoverAnchor>
    </Popover>
  )
}

function TemplateListInner(props: {
  busy: boolean
  templates: string[]
  onCloneTemplate: (id: string) => void
}) {
  const { setOpen } = usePopover()
  return (
    <div className="scrollbar-thin max-h-[320px] space-y-0.5 overflow-y-auto p-2">
      {props.templates.length === 0 ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">No templates on disk.</p>
      ) : (
        props.templates.map((tid) => {
          const m = templateMeta(tid)
          return (
            <button
              key={tid}
              type="button"
              className={cn('w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent')}
              onClick={() => {
                props.onCloneTemplate(tid)
                setOpen(false)
              }}
              disabled={props.busy}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{m.label}</span>
                {m.badge ? (
                  <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0 text-[10px] font-semibold uppercase text-primary">
                    {m.badge}
                  </span>
                ) : null}
              </div>
              <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{m.description}</span>
            </button>
          )
        })
      )}
    </div>
  )
}

function SavedWorkflowsPopover({
  busy,
  stored,
  onLoadSaved,
}: {
  busy: boolean
  stored: string[]
  onLoadSaved: (id: string) => void
}) {
  return (
    <Popover>
      <PopoverAnchor>
        <PopoverTrigger className={outlineBtn} disabled={busy}>
          Open saved
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <SavedWorkflowListInner busy={busy} stored={stored} onLoadSaved={onLoadSaved} />
        </PopoverContent>
      </PopoverAnchor>
    </Popover>
  )
}

function SavedWorkflowListInner(props: {
  busy: boolean
  stored: string[]
  onLoadSaved: (id: string) => void
}) {
  const { setOpen } = usePopover()
  return (
    <div className="scrollbar-thin max-h-[280px] overflow-y-auto p-1">
      {props.stored.length === 0 ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">No saved workflows.</p>
      ) : (
        props.stored.map((id) => (
          <button
            key={id}
            type="button"
            disabled={props.busy}
            className="w-full truncate rounded px-3 py-2 text-left font-mono text-[12px] text-foreground hover:bg-accent disabled:opacity-50"
            onClick={() => {
              props.onLoadSaved(id)
              setOpen(false)
            }}
          >
            {id}
          </button>
        ))
      )}
    </div>
  )
}

export function WorkflowTopBar({
  name,
  onNameChange,
  busy,
  onSave,
  stored,
  templates,
  onLoadSaved,
  onCloneTemplate,
  onRun,
  savedHint,
  canRun = true,
}: {
  name: string
  onNameChange: (s: string) => void
  busy: boolean
  onSave: () => void
  stored: string[]
  templates: string[]
  onLoadSaved: (id: string) => void
  onCloneTemplate: (id: string) => void
  onRun: () => void
  savedHint?: string
  /** When false, Run is disabled (e.g. empty canvas). */
  canRun?: boolean
}) {
  return (
    <header className="relative z-40 flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-background/80 px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 shadow-inner">
          <Zap className="h-4 w-4 text-white" aria-hidden />
        </span>
        <div className="hidden leading-tight sm:block">
          <div className="text-sm font-semibold tracking-tight text-foreground">Launchy</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Low-code workflows</div>
        </div>
      </div>

      <Separator orientation="vertical" className="hidden h-8 sm:block opacity-60" />

      <ThemeToggle />

      <div className="flex min-w-[120px] max-w-[220px] flex-1 flex-col gap-0.5">
        <label htmlFor="wf-name" className="sr-only">
          Workflow name
        </label>
        <Input
          id="wf-name"
          className="h-9 border-dashed border-muted-foreground/35 bg-muted/25 text-sm font-medium shadow-none ring-offset-background placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:bg-background"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Untitled workflow"
        />
        {savedHint ? <span className="text-[10px] text-muted-foreground">{savedHint}</span> : null}
      </div>

      <TemplatesMenuBtn templates={templates} busy={busy} onCloneTemplate={onCloneTemplate} />

      <SavedWorkflowsPopover stored={stored} busy={busy} onLoadSaved={onLoadSaved} />

      <Button variant="outline" size="sm" disabled={busy} type="button" onClick={() => void onSave()}>
        Save
      </Button>

      <Button
        variant="default"
        size="sm"
        disabled={busy || !canRun}
        title={!canRun ? 'Add at least one block to run this workflow' : undefined}
        className="gap-2 shadow-lg shadow-primary/25 dark:shadow-emerald-950/40 sm:ml-auto sm:shadow-none"
        type="button"
        onClick={() => void onRun()}
      >
        {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : <Zap className="h-4 w-4 shrink-0" aria-hidden />}
        Run
      </Button>
    </header>
  )
}

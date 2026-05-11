import { FolderOpen, LayoutTemplate, Loader2, Save, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  usePopover,
} from '@/components/ui/popover'
import { AppNav } from '@/components/AppNav'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'
import { partitionTemplateIds, templateMeta } from '@/lib/nodeCatalog'
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
        <PopoverTrigger
          className={cn(outlineBtn, 'max-sm:gap-1.5')}
          disabled={busy}
          title="Clone from a template"
        >
          <LayoutTemplate className="h-4 w-4 shrink-0" aria-hidden />
          <span className="max-w-[6.5rem] truncate sm:max-w-none">Templates</span>
        </PopoverTrigger>
        <PopoverContent className="w-80 border-border bg-card p-0 shadow-lg" align="start">
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
  const { general, usecase } = partitionTemplateIds(props.templates)

  const TemplateRow = (tid: string) => {
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
  }

  return (
    <div className="scrollbar-thin max-h-[min(420px,70vh)] space-y-2 overflow-y-auto p-2">
      {props.templates.length === 0 ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">No templates on disk.</p>
      ) : (
        <>
          <div>
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">General</div>
            <div className="space-y-0.5">{general.map(TemplateRow)}</div>
          </div>
          <div className="border-t border-border pt-2">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Use-case ready
            </div>
            <div className="space-y-0.5">{usecase.map(TemplateRow)}</div>
          </div>
        </>
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
        <PopoverTrigger
          className={cn(outlineBtn, 'max-sm:gap-1.5')}
          disabled={busy}
          title="Open a saved workflow"
        >
          <FolderOpen className="h-4 w-4 shrink-0" aria-hidden />
          <span className="max-w-[6rem] truncate sm:max-w-none">Saved</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 border-border bg-card p-0 shadow-lg">
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
    <header className="relative z-40 shrink-0 border-b border-border bg-background/95 px-3 py-2 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 shadow-inner">
              <Zap className="h-4 w-4 text-white" aria-hidden />
            </span>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-semibold tracking-tight text-foreground">Launchy</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Workflows</div>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden h-8 sm:block opacity-60" />

          <ThemeToggle />

          <Separator orientation="vertical" className="hidden h-8 md:block opacity-50" />

          <AppNav className="text-xs sm:text-sm" />

          <div className="min-w-0 flex-1 basis-[min(100%,12rem)] sm:basis-[14rem]">
            <label
              htmlFor="wf-name"
              className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:sr-only sm:mb-0"
            >
              Name
            </label>
            <Input
              id="wf-name"
              className="h-9 border-border/80 bg-muted/30 text-sm font-medium shadow-none ring-offset-background placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:bg-background"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Untitled workflow"
            />
            {savedHint ? (
              <span className="mt-1 block truncate text-[10px] text-muted-foreground">{savedHint}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-2 md:ml-auto md:flex-nowrap">
          <TemplatesMenuBtn templates={templates} busy={busy} onCloneTemplate={onCloneTemplate} />

          <SavedWorkflowsPopover stored={stored} busy={busy} onLoadSaved={onLoadSaved} />

          <Separator orientation="vertical" className="hidden h-7 md:block opacity-50" />

          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            type="button"
            className="gap-1.5"
            onClick={() => void onSave()}
          >
            <Save className="h-3.5 w-3.5 sm:hidden" aria-hidden />
            <span>Save</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={busy || !canRun}
            title={!canRun ? 'Add at least one block to run this workflow' : undefined}
            className="min-w-[4.75rem] gap-2 font-semibold shadow-md shadow-primary/20 dark:shadow-emerald-950/30 md:shadow-sm"
            type="button"
            onClick={() => void onRun()}
          >
            {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : <Zap className="h-4 w-4 shrink-0" aria-hidden />}
            Run
          </Button>
        </div>
      </div>
    </header>
  )
}

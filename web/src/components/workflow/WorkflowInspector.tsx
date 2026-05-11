import { Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Node } from 'reactflow'

import { SchemaForm, mergedParams } from '@/components/SchemaForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { getCatalogEntry } from '@/lib/nodeCatalog'
import type { WorkflowNodeData } from './WorkflowNode'

function stripPersisted(raw: WorkflowNodeData): Record<string, unknown> {
  const { wfType: _wt, label: _lb, ...rest } = raw
  return rest
}

function previewJson(obj: unknown, max = 8000): string {
  try {
    const s = JSON.stringify(obj, null, 2)
    return s.length > max ? `${s.slice(0, max)}\n…` : s
  } catch {
    return String(obj)
  }
}

export function WorkflowInspector({
  workflowId,
  selectedId,
  nodes,
  schemas,
  onApplyParams,
  runPayload,
}: {
  workflowId: string | undefined
  selectedId: string | null
  nodes: Node[]
  schemas: Record<string, unknown>
  onApplyParams: (nodeId: string, raw: WorkflowNodeData) => void
  runPayload: unknown
}) {
  const selected = useMemo(() => nodes.find((n) => n.id === selectedId), [nodes, selectedId])

  const wfTypeSel = selected ? ((selected.data as WorkflowNodeData).wfType ?? '') : ''
  const schemaForType = wfTypeSel ? schemas[wfTypeSel] : undefined
  const catalog = selected ? getCatalogEntry(wfTypeSel) : null

  const [formBlob, setFormBlob] = useState<Record<string, unknown>>({})

  const baseKey = `${workflowId}:${selected?.id}:${wfTypeSel}`
  useEffect(() => {
    if (!selected || !catalog) return
    const merged = mergedParams(schemaForType, stripPersisted(selected.data as WorkflowNodeData))
    setFormBlob(merged)
  }, [baseKey, wfTypeSel, schemaForType])

  const nodeOutPreview = useMemo(() => {
    if (!selectedId || !runPayload || typeof runPayload !== 'object') return undefined
    const rec = runPayload as { node_outputs?: Record<string, unknown> }
    return rec.node_outputs?.[selectedId]
  }, [selectedId, runPayload])

  if (!selected || !catalog) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-stretch border-t border-border/40 bg-muted/15 px-4 pb-4 pt-5">
        <p className="text-sm font-medium text-foreground">Select a step</p>
        <p className="mt-2 text-left text-xs leading-relaxed text-muted-foreground">
          Click any block on the canvas to edit its configuration. Outputs from the latest run appear on the{' '}
          <span className="font-medium text-foreground">Last run</span> tab after you execute.
        </p>
      </div>
    )
  }

  const wfType = wfTypeSel

  if (wfType === 'trigger.input') {
    const topicVal =
      typeof formBlob.default_topic === 'string' ? (formBlob.default_topic as string) : ''
    const setTopic = (next: string) => {
      const cleaned = next.replace(/^\s+/, '')
      const updated = { ...formBlob, default_topic: cleaned, keys: ['topic'] }
      setFormBlob(updated)
      onApplyParams(selected.id, { wfType, label: selected.id, ...updated })
    }
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border bg-gradient-to-br from-primary/5 to-transparent px-4 py-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Topic
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Type whatever you want a deep viral content &amp; marketing analysis on. That&apos;s it — hit{' '}
            <span className="font-semibold text-foreground">Run</span> when you&apos;re ready.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <label htmlFor="trigger-topic" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            What do you want researched?
          </label>
          <Textarea
            id="trigger-topic"
            autoFocus
            spellCheck
            placeholder="e.g. hairloss, study abroad, AI productivity tools…"
            className="mt-2 min-h-[120px] resize-y bg-background text-sm leading-relaxed"
            value={topicVal}
            onChange={(e) => setTopic(e.target.value)}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Other steps pull from this automatically—there isn&apos;t a separate topic box later in the workflow.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-1 border-b border-border bg-muted/30 px-3 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{catalog.label}</div>
          <div className="truncate font-mono text-sm font-semibold text-foreground">{selected.id}</div>
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">{catalog.description}</p>
        {wfType === 'voice.load' ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2.5 text-[11px] leading-relaxed dark:bg-emerald-500/[0.09]">
            <p className="font-medium text-emerald-950 dark:text-emerald-50">Where does the ID come from?</p>
            <p className="mt-1 text-muted-foreground">
              Open the{' '}
              <Link to="/voice" className="font-medium text-foreground underline-offset-4 hover:underline">
                Voice
              </Link>{' '}
              page, create a profile, then copy its <code className="rounded bg-background/80 px-1 font-mono text-[10px]">profile_id</code> into
              the field below. New Brand voice blocks use whichever profile is <strong className="text-foreground">Set active</strong> on Voice as a
              starting point — you can still change the ID here per workflow.
            </p>
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="form" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-3 grid shrink-0 grid-cols-2">
          <TabsTrigger className="text-xs" value="form">
            Settings
          </TabsTrigger>
          <TabsTrigger className="text-xs" value="output">
            Last run
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3">
          <SchemaForm
            wfType={wfType}
            catalog={catalog}
            schemaRaw={schemaForType ?? {}}
            value={formBlob}
            idPrefix={`n-${selected.id}`}
            onChange={(next) => {
              setFormBlob(next)
              onApplyParams(selected.id, { wfType, label: selected.id, ...next })
            }}
          />
        </TabsContent>

        <TabsContent value="output" className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3">
          {nodeOutPreview === undefined ? (
            <p className="text-xs text-muted-foreground">Run the workflow to see this node&apos;s stored output.</p>
          ) : (
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-2 font-mono text-[10px] leading-relaxed text-foreground/90">
              {previewJson(nodeOutPreview)}
            </pre>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

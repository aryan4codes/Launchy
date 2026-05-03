import 'reactflow/dist/style.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Background,
  Controls,
  type Connection,
  MarkerType,
  MiniMap,
  type Node,
  type ReactFlowInstance,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { WorkflowNodeData } from '@/components/workflow/WorkflowNode'
import { WorkflowNodeInner } from '@/components/workflow/WorkflowNode'
import { EmptyCanvasOverlay } from '@/components/workflow/EmptyCanvasOverlay'
import { NodeLibrary, readDraggedNodeType } from '@/components/workflow/NodeLibrary'
import { WorkflowInspector } from '@/components/workflow/WorkflowInspector'
import { deriveNodeExecOrder, RunDrawer } from '@/components/workflow/RunDrawer'
import { RunUiProvider, type NodeRunUi } from '@/components/workflow/runUi'
import { WorkflowTopBar } from '@/components/workflow/WorkflowTopBar'
import { StudioSkeleton } from '@/components/workflow/StudioSkeleton'
import { Skeleton } from '@/components/ui/skeleton'
import {
  cloneTemplate,
  createWorkflow,
  fetchNodeTypeSchemas,
  getWorkflow,
  getWorkflowRun,
  listStoredWorkflows,
  listTemplates,
  putWorkflow,
  startWorkflowRun,
  type WorkflowSpecJson,
  workflowRunWebSocketUrl,
} from '@/lib/api'
import { inferWorkflowInputKeys } from '@/lib/workflowInputs'
import { templateMeta } from '@/lib/nodeCatalog'
import { cn } from '@/lib/utils'

const nodeTypes = { wf: WorkflowNodeInner }

const NON_PERSIST_KEYS = new Set(['wfType', 'label'])

const edgeDefaults = {
  animated: true as const,
  style: { stroke: 'rgba(74,222,128,0.55)', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(74,222,128,0.75)' },
}

function omitNonPersist(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(raw).filter(([k]) => !NON_PERSIST_KEYS.has(k)))
}

function specToFlow(spec: WorkflowSpecJson): { nodes: Node[]; edges: import('reactflow').Edge[] } {
  // Base x starts at 320 so auto-positioned nodes clear the ~272px NodeLibrary panel.
  // 280px horizontal / 160px vertical spacing prevents overlap for ~220px-wide nodes.
  // Odd-indexed nodes stagger down 30px so parallel branches are visually distinct.
  const nodes: Node[] = spec.nodes.map((n, i) => ({
    id: n.id,
    type: 'wf',
    position: n.position ?? {
      x: 320 + (i % 6) * 280,
      y: Math.floor(i / 6) * 160 + (i % 2) * 30,
    },
    data: {
      wfType: n.type,
      label: n.id,
      ...(n.data ?? {}),
    } satisfies WorkflowNodeData,
  }))
  const edges = spec.edges.map((e, idx) => ({
    id: e.id ?? `${e.source}-${e.target}-${idx}`,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    ...edgeDefaults,
  }))
  return { nodes, edges }
}

/** First node users typically configure: topic trigger, else first node in the graph. */
function defaultConfigureNodeId(nodes: Node[]): string | null {
  const trigger = nodes.find((n) => (n.data as WorkflowNodeData).wfType === 'trigger.input')
  return trigger?.id ?? nodes[0]?.id ?? null
}

function flowToSpec(
  nodes: Node[],
  edges: import('reactflow').Edge[],
  name: string,
  id: string | undefined,
): WorkflowSpecJson {
  return {
    id,
    name,
    nodes: nodes.map((n) => {
      const raw = n.data as Record<string, unknown>
      const wfType = String(raw.wfType ?? '')
      const persist = omitNonPersist(raw)
      return {
        id: n.id,
        type: wfType,
        data: persist,
        position: n.position,
      }
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  }
}

interface WsEvt {
  type?: string
  node_id?: string
  payload?: { error?: string }
}

function RunInputsForm({
  keys,
  value,
  onChange,
}: {
  keys: string[]
  value: Record<string, string>
  onChange: (next: Record<string, string>) => void
}) {
  return (
    <div className="space-y-4">
      {keys.map((k) => (
        <div key={k} className="space-y-1">
          <label className="text-[11px] font-medium capitalize text-muted-foreground" htmlFor={`run-${k}`}>
            {k.replace(/_/g, ' ')}
          </label>
          <textarea
            id={`run-${k}`}
            rows={2}
            className="min-h-[44px] w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs text-foreground"
            spellCheck={false}
            value={value[k] ?? ''}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
          />
        </div>
      ))}
    </div>
  )
}

function FlowCanvasDnD({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setSelectedId,
  onConnect,
  onDropNode,
  onInit: onInitProp,
}: {
  nodes: Node[]
  edges: import('reactflow').Edge[]
  onNodesChange: ReturnType<typeof useNodesState>[2]
  onEdgesChange: ReturnType<typeof useEdgesState>[2]
  setSelectedId: (id: string | null) => void
  onConnect: (c: Connection) => void
  onDropNode: (wfType: string, pos: { x: number; y: number }) => void
  onInit?: (inst: ReactFlowInstance) => void
}) {
  const rfRef = useRef<ReactFlowInstance | null>(null)

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const wfType = readDraggedNodeType(e.dataTransfer)
      if (!wfType) return
      const inst = rfRef.current
      if (!inst) return
      const pos = inst.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      onDropNode(wfType, pos)
    },
    [onDropNode],
  )

  return (
    <ReactFlow
      className="studio-flow [&_.react-flow__attribution]:hidden"
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.22}
      maxZoom={1.6}
      onInit={(inst) => {
        rfRef.current = inst
        onInitProp?.(inst)
      }}
      onNodeClick={(_, n) => setSelectedId(n.id)}
      onPaneClick={() => setSelectedId(null)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Background gap={28} />
      <MiniMap
        nodeStrokeWidth={3}
        className="!rounded-lg !border !border-border !bg-card/95 !shadow-md dark:!border-white/15 dark:!bg-zinc-950/90 [&_.react-flow__minimap-mask]:opacity-95"
        zoomable
      />
      <Controls />
    </ReactFlow>
  )
}

export default function WorkflowStudio() {
  const [name, setName] = useState('Untitled workflow')
  const [workflowId, setWorkflowId] = useState<string | undefined>(undefined)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [schemas, setSchemas] = useState<Record<string, unknown>>({})
  const [templates, setTemplates] = useState<string[]>([])
  const [stored, setStored] = useState<string[]>([])
  const [runLogLines, setRunLogLines] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [runPayload, setRunPayload] = useState<unknown>(null)
  const [drawerExpanded, setDrawerExpanded] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [mobileStudioTab, setMobileStudioTab] = useState<'inspector' | 'inputs'>('inspector')
  const [runUi, setRunUi] = useState<Record<string, NodeRunUi>>({})
  const [studioReady, setStudioReady] = useState(false)
  const [openingWorkflow, setOpeningWorkflow] = useState(false)

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)

  const inputKeysArr = useMemo(() => inferWorkflowInputKeys(nodes), [nodes])
  const keysForRunForm = useMemo(() => inputKeysArr.filter((k) => k !== 'topic'), [inputKeysArr])
  const keysSig = inputKeysArr.join('|')

  const triggerDefaultTopic = useMemo(() => {
    const trig = nodes.find((n) => (n.data as { wfType?: string }).wfType === 'trigger.input')
    const dt = trig ? (trig.data as { default_topic?: unknown }).default_topic : undefined
    return typeof dt === 'string' ? dt.trim() : ''
  }, [nodes])

  const [inputsForm, setInputsForm] = useState<Record<string, string>>({})

  useEffect(() => {
    const inferred = keysSig ? keysSig.split('|').filter(Boolean) : []
    const keysLive = inferred.length ? inferred : inferWorkflowInputKeys(nodes)
    setInputsForm((prev) => {
      const n: Record<string, string> = {}
      for (const k of keysLive) {
        if (k === 'topic') continue
        n[k] = prev[k] ?? ''
      }
      return n
    })
  }, [keysSig, nodes])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchNodeTypeSchemas().catch((e) => {
        console.error(e)
        return {} as Record<string, unknown>
      }),
      listTemplates().catch((e) => {
        console.error(e)
        return [] as string[]
      }),
      listStoredWorkflows().catch((e) => {
        console.error(e)
        return [] as string[]
      }),
    ])
      .then(([s, t, w]) => {
        if (!cancelled) {
          setSchemas(s)
          setTemplates(t)
          setStored(w)
        }
      })
      .finally(() => {
        if (!cancelled) setStudioReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const commitWorkflowToServer = useCallback(async (): Promise<string | undefined> => {
    const spec = flowToSpec(nodes, edges, name, workflowId)
    if (workflowId) {
      const saved = await putWorkflow(workflowId, spec)
      setWorkflowId(saved.id ?? workflowId)
      setName(saved.name)
      setStored(await listStoredWorkflows())
      return saved.id ?? workflowId
    }
    const created = await createWorkflow(spec)
    setWorkflowId(created.id ?? undefined)
    setName(created.name)
    setStored(await listStoredWorkflows())
    return created.id ?? undefined
  }, [nodes, edges, name, workflowId])

  const saveWithSpinner = useCallback(async () => {
    setBusy(true)
    try {
      await commitWorkflowToServer()
    } finally {
      setBusy(false)
    }
  }, [commitWorkflowToServer])

  const loadId = useCallback(
    async (id: string) => {
      setOpeningWorkflow(true)
      try {
        const spec = await getWorkflow(id)
        const { nodes: n, edges: ed } = specToFlow(spec)
        setNodes(n)
        setEdges(ed)
        setWorkflowId(spec.id ?? id)
        setName(spec.name)
        setSelectedId(defaultConfigureNodeId(n))
        setInspectorOpen(true)
        setMobileStudioTab('inspector')
        setRunPayload(null)
        setRunUi({})
        setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.15 }), 150)
      } catch (e) {
        console.error(e)
        window.alert(e instanceof Error ? e.message : 'Could not open that workflow.')
      } finally {
        setOpeningWorkflow(false)
      }
    },
    [setNodes, setEdges],
  )

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, ...edgeDefaults }, eds)),
    [setEdges],
  )

  const addNodeAtPosition = useCallback(
    (wfType: string, position: { x: number; y: number }) => {
      const id = `n-${crypto.randomUUID().slice(0, 8)}`
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: 'wf',
          position,
          data: { wfType, label: id } satisfies WorkflowNodeData,
        },
      ])
      setSelectedId(id)
    },
    [setNodes],
  )

  const onCloneTemplateCb = useCallback(
    async (tid: string) => {
      setBusy(true)
      try {
        const spec = await cloneTemplate(tid, `${templateMeta(tid).label} (copy)`)
        const { nodes: n, edges: ed } = specToFlow(spec)
        setNodes(n)
        setEdges(ed)
        setWorkflowId(spec.id ?? undefined)
        setName(spec.name)
        setSelectedId(defaultConfigureNodeId(n))
        setInspectorOpen(true)
        setMobileStudioTab('inspector')
        setStored(await listStoredWorkflows())
        setTimeout(() => rfInstanceRef.current?.fitView({ padding: 0.15 }), 150)
      } finally {
        setBusy(false)
      }
    },
    [setNodes, setEdges],
  )

  const onApplyParams = useCallback(
    (nodeId: string, data: WorkflowNodeData) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...data } } : n)))
    },
    [setNodes],
  )

  const consumeWsMessage = (line: string): WsEvt | null => {
    try {
      return JSON.parse(line) as WsEvt
    } catch {
      return null
    }
  }

  const resetRunIndicators = () => setRunUi({})

  const coerceInputsBody = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    const numish = /^-?\d+(\.\d+)?$/
    const NUM_HINT_KEYS = /^top_k|^limit|^predicted|^score$/i

    for (const k of Object.keys(inputsForm)) {
      const raw = inputsForm[k].trimEnd()
      if (raw.trim() === '') continue
      if (NUM_HINT_KEYS.test(k) && numish.test(raw.trim())) out[k] = Number(raw.trim())
      else out[k] = raw
    }
    return out
  }

  const runWorkflow = async () => {
    setRunPayload(null)
    setRunLogLines([])
    resetRunIndicators()

    let inputsBody = coerceInputsBody()
    delete inputsBody.topic
    const topic = triggerDefaultTopic
    if (!topic) {
      window.alert('Please type your topic on the Topic step (the first node) before running.')
      return
    }
    inputsBody.topic = topic

    const imageNodeMissingModel = nodes.find((n) => {
      const data = n.data as WorkflowNodeData
      if (data.wfType !== 'media.gemini_image') return false
      const chosen = typeof data.image_model === 'string' ? data.image_model.trim() : ''
      return chosen !== 'flux_dev' && chosen !== 'nano_banana_2' && chosen !== 'gpt_image_2'
    })
    if (imageNodeMissingModel) {
      setSelectedId(imageNodeMissingModel.id)
      setInspectorOpen(true)
      setMobileStudioTab('inspector')
      window.alert(
        'Please choose an image model (FLUX Dev, Nano Banana 2, or GPT Image 2) in the selected Image node before running.',
      )
      return
    }

    const wid = await commitWorkflowToServer()
    if (!wid) return

    setBusy(true)
    try {
      const { run_id } = await startWorkflowRun(wid, inputsBody)
      setRunLogLines((prev) => [...prev, `run_id=${run_id}`])

      await new Promise<void>((resolve) => {
        const ws = new WebSocket(workflowRunWebSocketUrl(run_id))
        let settled = false
        let timeoutId = 0
        const finish = () => {
          if (settled) return
          settled = true
          window.clearTimeout(timeoutId)
          try {
            ws.close()
          } catch {
            /* ignore */
          }
          resolve()
        }
        timeoutId = window.setTimeout(finish, 240_000)

        ws.onmessage = (ev) => {
          const text = typeof ev.data === 'string' ? ev.data : String(ev.data)
          setRunLogLines((prev) => [...prev, text])
          const msg = consumeWsMessage(text)
          if (msg?.type === 'node_started' && msg.node_id)
            setRunUi((prev) => ({ ...prev, [msg.node_id!]: { status: 'running' } }))
          else if (msg?.type === 'node_finished' && msg.node_id)
            setRunUi((prev) => ({ ...prev, [msg.node_id!]: { status: 'done' } }))
          else if (msg?.type === 'node_failed' && msg.node_id)
            setRunUi((prev) => ({
              ...prev,
              [msg.node_id!]: { status: 'failed', error: msg.payload?.error },
            }))
          else if (msg?.type === 'run_finished' || msg?.type === 'sync') finish()
        }

        ws.onerror = finish
      })

      setRunPayload(await getWorkflowRun(run_id))
    } finally {
      setBusy(false)
    }
  }

  const exeOrderIds = deriveNodeExecOrder(
    nodes.map((n) => n.id),
    edges,
  )
  const nodeTypesById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, (n.data as WorkflowNodeData).wfType])), [nodes])

  if (!studioReady) {
    return (
      <div className="h-screen min-h-0 bg-background selection:bg-primary/25 selection:text-foreground dark:selection:bg-emerald-500/30 dark:selection:text-emerald-50">
        <StudioSkeleton />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background selection:bg-primary/25 selection:text-foreground dark:selection:bg-emerald-500/30 dark:selection:text-emerald-50">
      <WorkflowTopBar
        name={name}
        busy={busy || openingWorkflow}
        onNameChange={setName}
        onSave={() => void saveWithSpinner()}
        stored={stored}
        templates={templates}
        savedHint={workflowId ? `Saved · ${workflowId}` : undefined}
        onLoadSaved={(id) => void loadId(id)}
        onCloneTemplate={(tid) => void onCloneTemplateCb(tid)}
        onRun={() => void runWorkflow()}
        canRun={nodes.length > 0 && !openingWorkflow}
      />

      {/*
        Floating NodeLibrary (fixed) leaves the canvas full-bleed on the left.
        xl: canvas + inspector share the upper band; Run drawer spans full width below both.
      */}
      <NodeLibrary
        key={`${workflowId ?? 'draft'}-${nodes.length > 0 ? 'filled' : 'empty'}`}
        templates={templates}
        busy={busy || openingWorkflow}
        onCloneTemplate={(tid) => void onCloneTemplateCb(tid)}
        initialBlocksCollapsed={nodes.length === 0}
        runDrawerExpanded={drawerExpanded}
        onAdd={(wfType) => addNodeAtPosition(wfType, { x: 180 + nodes.length * 18, y: 120 + nodes.length * 16 })}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Upper band: canvas + inspector (desktop); canvas only on small screens */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div
              className={
                nodes.length === 0
                  ? 'relative isolate h-full min-h-[min(50vh,360px)] min-w-0 flex-1 xl:min-h-0'
                  : 'relative h-full min-h-[min(50vh,360px)] min-w-0 flex-1 xl:min-h-0'
              }
            >
              <RunUiProvider value={runUi}>
                <FlowCanvasDnD
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  setSelectedId={setSelectedId}
                  onConnect={onConnect}
                  onDropNode={addNodeAtPosition}
                  onInit={(inst) => { rfInstanceRef.current = inst }}
                />
              </RunUiProvider>
              {nodes.length === 0 ? (
                <EmptyCanvasOverlay
                  templates={templates}
                  busy={busy || openingWorkflow}
                  onCloneTemplate={(tid) => void onCloneTemplateCb(tid)}
                />
              ) : null}
              {openingWorkflow ? (
                <div
                  className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-background/75 px-6 backdrop-blur-[2px]"
                  role="status"
                  aria-live="polite"
                  aria-label="Loading workflow"
                >
                  <p className="text-center text-sm font-medium text-muted-foreground">Opening workflow…</p>
                  <div className="grid w-full max-w-md grid-cols-3 gap-3">
                    {Array.from({ length: 6 }, (_, i) => (
                      <Skeleton key={i} className="h-24 rounded-lg bg-muted/60" />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Inspector: desktop rail; ends above full-width progress drawer */}
          <div
            className={cn(
              'relative hidden shrink-0 overflow-hidden border-l border-border bg-muted/10 transition-[width] duration-300 ease-out xl:block',
              inspectorOpen ? 'w-[340px]' : 'w-0 border-l-transparent',
            )}
          >
            <aside className="flex h-full w-[340px] min-w-[340px] flex-col">
              <div className="flex shrink-0 items-start gap-2 border-b border-border bg-card/70 px-2 py-1.5 pl-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-0.5 h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                  type="button"
                  title="Hide inspector"
                  aria-expanded={inspectorOpen}
                  aria-controls="workflow-inspector-panel"
                  onClick={() => setInspectorOpen(false)}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Hide inspector</span>
                </Button>
                <div className="min-w-0 flex-1 py-0.5">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Inspector</h2>
                  <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                    Fields per step; open optional sections when a block exposes tuning.
                  </p>
                </div>
              </div>
              <div
                id="workflow-inspector-panel"
                className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto"
              >
                <WorkflowInspector
                  workflowId={workflowId}
                  selectedId={selectedId}
                  nodes={nodes}
                  schemas={schemas}
                  runPayload={runPayload}
                  onApplyParams={onApplyParams}
                />
              </div>
            </aside>
          </div>
        </div>

        <RunDrawer
          expanded={drawerExpanded}
          onToggleExpanded={() => setDrawerExpanded((v) => !v)}
          runLogText={runLogLines.join('\n\n')}
          runPayload={runPayload}
          busy={busy || openingWorkflow}
          nodeIdsOrdered={exeOrderIds}
          nodeTypesById={nodeTypesById}
          nodeRunUi={runUi}
          inputsSlot={
            keysForRunForm.length ? (
              <RunInputsForm keys={keysForRunForm} value={inputsForm} onChange={setInputsForm} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Topic lives on the first step. Edit it there, then hit Run.
              </p>
            )
          }
        />

        {!inspectorOpen ? (
          <Button
            variant="secondary"
            size="sm"
            type="button"
            title="Show inspector"
            className="fixed right-0 top-[22%] z-[30] hidden h-auto min-h-0 w-10 shrink-0 flex-col items-center justify-center gap-2 rounded-l-xl rounded-r-none border border-r-0 px-1 py-5 shadow-lg xl:flex xl:h-auto"
            onClick={() => setInspectorOpen(true)}
          >
            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span
              aria-hidden
              className="select-none text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground [text-orientation:mixed] [writing-mode:vertical-rl]"
            >
              Inspector
            </span>
            <span className="sr-only">Open inspector panel</span>
          </Button>
        ) : null}
      </div>

      <div className="border-t border-border bg-card/80 xl:hidden">
        <Tabs
          value={mobileStudioTab}
          onValueChange={(v) => setMobileStudioTab(v === 'inputs' ? 'inputs' : 'inspector')}
          className="w-full"
        >
          <TabsList className="m-3 mx-auto grid w-[min(100%,28rem)] grid-cols-2">
            <TabsTrigger value="inspector" className="text-xs">
              Inspector
            </TabsTrigger>
            <TabsTrigger value="inputs" className="text-xs">
              Run inputs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="inspector" className="max-h-[48vh] overflow-y-auto scrollbar-thin px-3 pb-4">
            <WorkflowInspector
              workflowId={workflowId}
              selectedId={selectedId}
              nodes={nodes}
              schemas={schemas}
              runPayload={runPayload}
              onApplyParams={onApplyParams}
            />
          </TabsContent>
          <TabsContent value="inputs" className="max-h-[48vh] overflow-y-auto scrollbar-thin px-3 pb-4">
            {keysForRunForm.length ? (
              <RunInputsForm keys={keysForRunForm} value={inputsForm} onChange={setInputsForm} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Topic lives on the first step. Edit it there, then hit Run.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

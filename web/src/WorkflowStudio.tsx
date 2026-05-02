import 'reactflow/dist/style.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import type { WorkflowNodeData } from '@/components/workflow/WorkflowNode'
import { WorkflowNodeInner } from '@/components/workflow/WorkflowNode'
import { EmptyCanvasOverlay } from '@/components/workflow/EmptyCanvasOverlay'
import { NodeLibrary, readDraggedNodeType } from '@/components/workflow/NodeLibrary'
import { WorkflowInspector } from '@/components/workflow/WorkflowInspector'
import { deriveNodeExecOrder, RunDrawer } from '@/components/workflow/RunDrawer'
import { RunUiProvider, type NodeRunUi } from '@/components/workflow/runUi'
import { WorkflowTopBar } from '@/components/workflow/WorkflowTopBar'
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
  const nodes: Node[] = spec.nodes.map((n, i) => ({
    id: n.id,
    type: 'wf',
    position: n.position ?? { x: (i % 6) * 200, y: Math.floor(i / 6) * 120 },
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
}: {
  nodes: Node[]
  edges: import('reactflow').Edge[]
  onNodesChange: ReturnType<typeof useNodesState>[2]
  onEdgesChange: ReturnType<typeof useEdgesState>[2]
  setSelectedId: (id: string | null) => void
  onConnect: (c: Connection) => void
  onDropNode: (wfType: string, pos: { x: number; y: number }) => void
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
  const [drawerExpanded, setDrawerExpanded] = useState(true)
  const [runUi, setRunUi] = useState<Record<string, NodeRunUi>>({})

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
    fetchNodeTypeSchemas().then(setSchemas).catch(console.error)
    listTemplates().then(setTemplates).catch(console.error)
    listStoredWorkflows().then(setStored).catch(console.error)
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
      const spec = await getWorkflow(id)
      const { nodes: n, edges: ed } = specToFlow(spec)
      setNodes(n)
      setEdges(ed)
      setWorkflowId(spec.id ?? id)
      setName(spec.name)
      setSelectedId(null)
      setRunPayload(null)
      setRunUi({})
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
        const spec = await cloneTemplate(tid, `${tid}-copy`)
        const { nodes: n, edges: ed } = specToFlow(spec)
        setNodes(n)
        setEdges(ed)
        setWorkflowId(spec.id ?? undefined)
        setName(spec.name)
        setSelectedId(null)
        setStored(await listStoredWorkflows())
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

  return (
    <div className="flex h-screen flex-col bg-background selection:bg-primary/25 selection:text-foreground dark:selection:bg-emerald-500/30 dark:selection:text-emerald-50">
      <WorkflowTopBar
        name={name}
        busy={busy}
        onNameChange={setName}
        onSave={() => void saveWithSpinner()}
        stored={stored}
        templates={templates}
        savedHint={workflowId ? `Saved · ${workflowId}` : undefined}
        onLoadSaved={(id) => void loadId(id)}
        onCloneTemplate={(tid) => void onCloneTemplateCb(tid)}
        onRun={() => void runWorkflow()}
        canRun={nodes.length > 0}
      />

      {/*
        xl: drawer spans only canvas + inspector columns so the blocks library stays full-height
        and is never covered by the run console. Mobile: single column, drawer below canvas.
      */}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden xl:grid-cols-[260px_minmax(0,1fr)_380px] xl:grid-rows-[minmax(0,1fr)_auto]">
        <NodeLibrary
          key={`${workflowId ?? 'draft'}-${nodes.length > 0 ? 'filled' : 'empty'}`}
          className="min-h-0 overflow-hidden xl:row-span-2"
          templates={templates}
          busy={busy}
          onCloneTemplate={(tid) => void onCloneTemplateCb(tid)}
          initialBlocksCollapsed={nodes.length === 0}
          onAdd={(wfType) => addNodeAtPosition(wfType, { x: 180 + nodes.length * 18, y: 120 + nodes.length * 16 })}
        />

        <div
          className={
            nodes.length === 0
              ? 'relative isolate h-full min-h-[min(50vh,360px)] xl:min-h-0 xl:col-start-2 xl:row-start-1'
              : 'relative h-full min-h-[min(50vh,360px)] xl:min-h-0 xl:col-start-2 xl:row-start-1'
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
            />
          </RunUiProvider>
          {nodes.length === 0 ? (
            <EmptyCanvasOverlay templates={templates} busy={busy} onCloneTemplate={(tid) => void onCloneTemplateCb(tid)} />
          ) : null}
        </div>

        <aside className="hidden min-h-0 flex-col overflow-hidden border-l border-border bg-muted/10 xl:col-start-3 xl:row-start-1 xl:flex">
          <div className="shrink-0 border-b border-border bg-card/70 px-3 py-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Inspector</h2>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Guided fields for each handler. Toggle &quot;Raw JSON&quot; for power tweaks.
            </p>
          </div>
          <WorkflowInspector
            workflowId={workflowId}
            selectedId={selectedId}
            nodes={nodes}
            schemas={schemas}
            runPayload={runPayload}
            onApplyParams={onApplyParams}
          />
        </aside>

        <RunDrawer
          className="xl:col-span-2 xl:col-start-2 xl:row-start-2"
          expanded={drawerExpanded}
          onToggleExpanded={() => setDrawerExpanded((v) => !v)}
          runLogText={runLogLines.join('\n\n')}
          runPayload={runPayload}
          busy={busy}
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
      </div>

      <div className="border-t border-border bg-card/80 xl:hidden">
        <Tabs defaultValue="inspector" className="w-full">
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

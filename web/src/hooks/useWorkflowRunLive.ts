import type { Edge } from 'reactflow'
import { useEffect, useMemo, useState } from 'react'

import { deriveNodeExecOrder } from '@/components/workflow/HorizontalRunProgress'
import type { NodeRunUi } from '@/components/workflow/runUi'
import { getWorkflowRun, workflowRunWebSocketUrl } from '@/lib/api'
import { parseRunMeta } from '@/lib/runPayloadDisplay'

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export function progressGraphFromRunPayload(payload: unknown): {
  nodeIdsOrdered: string[]
  nodeTypesById: Record<string, string>
} {
  if (!isRecord(payload) || !isRecord(payload.workflow)) {
    return { nodeIdsOrdered: [], nodeTypesById: {} }
  }
  const wf = payload.workflow
  const nodes = wf.nodes
  const edgesRaw = wf.edges
  if (!Array.isArray(nodes)) return { nodeIdsOrdered: [], nodeTypesById: {} }

  const ids: string[] = []
  const types: Record<string, string> = {}
  for (const n of nodes) {
    if (isRecord(n) && typeof n.id === 'string' && typeof n.type === 'string') {
      ids.push(n.id)
      types[n.id] = n.type
    }
  }
  const edges: Edge[] = []
  if (Array.isArray(edgesRaw)) {
    for (const e of edgesRaw) {
      if (isRecord(e) && typeof e.source === 'string' && typeof e.target === 'string') {
        edges.push({ source: e.source, target: e.target })
      }
    }
  }
  const nodeIdsOrdered = deriveNodeExecOrder(ids, edges)
  return { nodeIdsOrdered: nodeIdsOrdered.length ? nodeIdsOrdered : ids, nodeTypesById: types }
}

function mergeRunUiFromOutputs(
  ordered: string[],
  payload: unknown,
  prev: Record<string, NodeRunUi>,
): Record<string, NodeRunUi> {
  if (!isRecord(payload) || !isRecord(payload.node_outputs)) return prev
  const no = payload.node_outputs as Record<string, unknown>
  const next = { ...prev }
  for (const id of ordered) {
    if (!(id in no) || no[id] == null) continue
    if (next[id]?.status === 'failed') continue
    next[id] = { status: 'done' }
  }
  return next
}

type WsEvt = {
  type?: string
  node_id?: string
  payload?: { error?: string }
}

function consumeWsMessage(line: string): WsEvt | null {
  try {
    return JSON.parse(line) as WsEvt
  } catch {
    return null
  }
}

/**
 * Poll + WebSocket updates for a workflow run (creator campaign page, etc.).
 */
export function useWorkflowRunLive(runId: string | undefined) {
  const [payload, setPayload] = useState<unknown>(null)
  const [runUi, setRunUi] = useState<Record<string, NodeRunUi>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const { nodeIdsOrdered, nodeTypesById } = useMemo(() => progressGraphFromRunPayload(payload), [payload])
  const meta = useMemo(() => parseRunMeta(payload), [payload])

  const busy = meta.status === 'running'

  useEffect(() => {
    if (!runId) {
      setLoading(false)
      setErr('Missing run id')
      return
    }

    setRunUi({})
    setPayload(null)
    setLoading(true)
    setErr(null)

    let cancelled = false
    let pollId = 0

    const clearPoll = () => {
      if (pollId) window.clearInterval(pollId)
      pollId = 0
    }

    const refresh = async () => {
      try {
        const data = await getWorkflowRun(runId)
        if (cancelled) return
        setPayload(data)
        setErr(null)
        const { nodeIdsOrdered: ord } = progressGraphFromRunPayload(data)
        setRunUi((prev) => mergeRunUiFromOutputs(ord, data, prev))
        const st = isRecord(data) && typeof data.status === 'string' ? data.status : ''
        if (st === 'completed' || st === 'failed') clearPoll()
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load this campaign.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void refresh()
    pollId = window.setInterval(() => void refresh(), 2000)

    const ws = new WebSocket(workflowRunWebSocketUrl(runId))
    ws.onmessage = (ev) => {
      const text = typeof ev.data === 'string' ? ev.data : String(ev.data)
      const msg = consumeWsMessage(text)
      if (msg?.type === 'node_started' && msg.node_id) {
        setRunUi((prev) => ({ ...prev, [msg.node_id!]: { status: 'running' } }))
      } else if (msg?.type === 'node_finished' && msg.node_id) {
        setRunUi((prev) => ({ ...prev, [msg.node_id!]: { status: 'done' } }))
      } else if (msg?.type === 'node_failed' && msg.node_id) {
        setRunUi((prev) => ({
          ...prev,
          [msg.node_id!]: { status: 'failed', error: msg.payload?.error },
        }))
      } else if (msg?.type === 'run_finished' || msg?.type === 'sync') {
        void refresh()
      }
    }

    return () => {
      cancelled = true
      clearPoll()
      try {
        ws.close()
      } catch {
        /* ignore */
      }
    }
  }, [runId])

  return { payload, loading, err, runUi, nodeIdsOrdered, nodeTypesById, meta, busy }
}

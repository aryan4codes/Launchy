import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

/** Ephemeral runtime status for canvas badges (never persisted). */
export type NodeRunStatus = 'idle' | 'running' | 'done' | 'failed'

export interface NodeRunUi {
  status: NodeRunStatus
  error?: string
}

const Ctx = createContext<Record<string, NodeRunUi>>({})

export function RunUiProvider({
  value,
  children,
}: {
  value: Record<string, NodeRunUi>
  children: ReactNode
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRunUi(nodeId: string): NodeRunUi | undefined {
  return useContext(Ctx)[nodeId]
}

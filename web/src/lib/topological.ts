import type { Edge } from 'reactflow'

/** Match `workflow.engine.topological_order`: stable order by first node list occurrence. */
export function topologicalOrder(nodeIdsInOrder: string[], edges: Edge[]): string[] {
  const known = new Set(nodeIdsInOrder)
  const indeg: Record<string, number> = Object.fromEntries(nodeIdsInOrder.map((id) => [id, 0]))
  const adj: Record<string, string[]> = Object.fromEntries(nodeIdsInOrder.map((id) => [id, []]))
  for (const e of edges) {
    const s = e.source
    const t = e.target
    if (!known.has(s) || !known.has(t)) continue
    adj[s]?.push(t)
    indeg[t] = (indeg[t] ?? 0) + 1
  }
  const q: string[] = nodeIdsInOrder.filter((n) => (indeg[n] ?? 0) === 0)
  const out: string[] = []
  while (q.length) {
    const u = q.shift()!
    out.push(u)
    for (const v of adj[u] ?? []) {
      indeg[v] -= 1
      if (indeg[v] === 0) q.push(v)
    }
  }
  return out.length === nodeIdsInOrder.length ? out : []
}

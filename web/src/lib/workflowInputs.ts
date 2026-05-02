import type { Node } from 'reactflow'

export const DEFAULT_TRIGGER_KEYS = ['topic', 'platforms']

export function inferWorkflowInputKeys(nodes: Node[]): string[] {
  const trig = nodes.filter((n) => (n.data as { wfType?: string }).wfType === 'trigger.input')
  const keysSeen = new Set<string>()
  for (const n of trig) {
    const raw = n.data as { keys?: unknown }
    const k = raw.keys
    if (Array.isArray(k))
      k.forEach((x) => {
        if (typeof x === 'string' && x.length) keysSeen.add(x)
      })
  }
  if (keysSeen.size) return [...keysSeen]
  return [...DEFAULT_TRIGGER_KEYS]
}

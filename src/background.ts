import { Capacitor, registerPlugin } from '@capacitor/core'
import type { AgentRun, Memory, Workspace } from './types'

export type BackgroundStatus = {
  enabled: boolean
  pendingCount: number
  lastRunAt: string
  lastError: string
  notificationsGranted: boolean
  reason?: 'provider_changed'
}

interface OrbitBackgroundBridge {
  configure(options: { workspace: string; apiKey: string }): Promise<BackgroundStatus>
  syncWorkspace(options: { workspace: string }): Promise<BackgroundStatus>
  updateKey(options: { apiKey: string }): Promise<BackgroundStatus>
  disable(): Promise<BackgroundStatus>
  clear(): Promise<BackgroundStatus>
  status(): Promise<BackgroundStatus>
  restoreKey(): Promise<{ apiKey: string }>
  pending(): Promise<{ runs: unknown[] }>
  acknowledge(options: { ids: string[] }): Promise<BackgroundStatus>
  requestNotifications(): Promise<{ granted: boolean }>
}

export const OrbitBackground = registerPlugin<OrbitBackgroundBridge>('OrbitBackground')
export const supportsBackgroundRuns = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

/** Native jobs only receive scheduling details, provider settings and already-approved memories.
 * Tool credentials, pending suggestions, run history, and the AI key are never in this snapshot.
 */
export function backgroundSnapshot(workspace: Workspace): string {
  const memories: Memory[] = []
  for (const agent of workspace.agents) {
    memories.push(...workspace.memories
      .filter(memory => memory.agentId === agent.id)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20))
  }
  return JSON.stringify({
    agents: workspace.agents.map(({ id, name, role, description, instructions, enabled, schedule, recurringGoal, createdAt, lastRunAt }) =>
      ({ id, name, role, description, instructions, enabled, schedule, recurringGoal, createdAt, lastRunAt })),
    memories: memories.map(({ agentId, content, pinned, createdAt }) => ({ agentId, content, pinned, createdAt })),
    settings: workspace.settings,
  })
}

function isBackgroundRun(value: unknown): value is AgentRun {
  if (!value || typeof value !== 'object') return false
  const run = value as Partial<AgentRun>
  return typeof run.id === 'string' && typeof run.agentId === 'string' && typeof run.goal === 'string'
    && typeof run.output === 'string' && typeof run.createdAt === 'string' && Array.isArray(run.steps)
    && (run.status === 'completed' || run.status === 'failed') && run.source === 'schedule'
}

/** Idempotent: pending native results can be imported again safely after a failed acknowledgement. */
export function mergeBackgroundRuns(workspace: Workspace, incoming: unknown[]): Workspace {
  const known = new Set(workspace.runs.map(run => run.id))
  const additions: AgentRun[] = []
  for (const item of incoming) {
    if (!isBackgroundRun(item) || known.has(item.id) || !workspace.agents.some(agent => agent.id === item.agentId)) continue
    known.add(item.id)
    additions.push(item)
  }
  if (!additions.length) return workspace
  return {
    ...workspace,
    runs: [...additions, ...workspace.runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    agents: workspace.agents.map(agent => {
      const latest = additions.filter(run => run.agentId === agent.id).reduce((date, run) =>
        run.createdAt > date ? run.createdAt : date, agent.lastRunAt ?? '')
      return latest && latest !== agent.lastRunAt ? { ...agent, lastRunAt: latest } : agent
    }),
  }
}

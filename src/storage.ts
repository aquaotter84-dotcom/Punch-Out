import type { Workspace, Agent, Memory, Integration, AgentRun } from './types'

const STORAGE_KEY = 'orbit-workspace-v1'
const RECOVERY_KEY = 'orbit-workspace-v1-recovery'
const KEY_STORAGE = 'orbit-ai-key-session'

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

export function initialWorkspace(): Workspace {
  const agents: Agent[] = [
    {
      id: 'atlas', name: 'Atlas', role: 'Research assistant',
      description: 'Finds the signal in all the noise, then brings you the important bits.',
      instructions: 'Research the topic carefully. Be concise, cite links when a connected research tool provides them, distinguish facts from assumptions, and give practical takeaways.',
      icon: 'search', color: 'lavender', schedule: 'manual', recurringGoal: '', enabled: true,
      toolIds: [], createdAt: hoursAgo(240),
    },
    {
      id: 'piper', name: 'Piper', role: 'Content creator',
      description: 'Turns your rough ideas into words people actually want to read.',
      instructions: 'Write with clarity and personality. Start with a strong hook, keep the tone warm and direct, and avoid generic marketing language. Ask for missing context when needed.',
      icon: 'pen', color: 'peach', schedule: 'manual', recurringGoal: '', enabled: true,
      toolIds: [], createdAt: hoursAgo(192),
    },
    {
      id: 'scout', name: 'Scout', role: 'Daily briefing',
      description: 'A curious second set of eyes for the things you care about.',
      instructions: 'Prepare short, useful briefings. Prioritize developments that are new or actionable. If no live information tool is connected, explicitly say that you cannot verify current events.',
      icon: 'radar', color: 'mint', schedule: 'manual', recurringGoal: '', enabled: true,
      toolIds: [], createdAt: hoursAgo(144),
    },
  ]
  const memories: Memory[] = [
    { id: 'mem-1', agentId: 'atlas', content: 'Prioritize trustworthy sources and include links whenever they are available.', kind: 'preference', pinned: true, source: 'sample', createdAt: hoursAgo(84) },
    { id: 'mem-2', agentId: 'atlas', content: 'I prefer a short summary before the deeper details.', kind: 'preference', pinned: false, source: 'sample', createdAt: hoursAgo(54) },
    { id: 'mem-3', agentId: 'piper', content: 'My writing voice is clear, friendly, and a little playful. Avoid buzzwords.', kind: 'preference', pinned: true, source: 'sample', createdAt: hoursAgo(72) },
    { id: 'mem-4', agentId: 'piper', content: 'I usually write for founders and small creative teams.', kind: 'fact', pinned: false, source: 'sample', createdAt: hoursAgo(48) },
    { id: 'mem-5', agentId: 'scout', content: 'Keep briefings to five points or fewer.', kind: 'preference', pinned: false, source: 'sample', createdAt: hoursAgo(30) },
  ]
  const runs: AgentRun[] = [
    {
      id: 'sample-run-1', agentId: 'atlas', goal: 'Map out interesting ideas for a new project',
      output: 'This is an example run to show what your agent workspace looks like. Add an AI key in Settings, then give Atlas a real task to get started.',
      status: 'preview', source: 'sample', createdAt: hoursAgo(18),
      steps: [{ id: 'step-1', label: 'Example run', detail: 'Starter workspace example', status: 'done', createdAt: hoursAgo(18) }],
    },
    {
      id: 'sample-run-2', agentId: 'piper', goal: 'Draft a welcome note for new subscribers',
      output: 'This is an example run. Connect your AI provider to generate a real response tailored to your instructions and memories.',
      status: 'preview', source: 'sample', createdAt: hoursAgo(42),
      steps: [{ id: 'step-2', label: 'Example run', detail: 'Starter workspace example', status: 'done', createdAt: hoursAgo(42) }],
    },
  ]
  return {
    agents, memories, integrations: [], runs,
    settings: { provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    dismissedWelcome: false,
  }
}

export function isValidAgent(value: unknown): value is Agent {
  if (!value || typeof value !== 'object') return false
  const agent = value as Partial<Agent>
  return typeof agent.id === 'string' && typeof agent.name === 'string' && typeof agent.role === 'string' && typeof agent.description === 'string' && typeof agent.instructions === 'string' && typeof agent.icon === 'string' && typeof agent.color === 'string' && typeof agent.schedule === 'string' && typeof agent.recurringGoal === 'string' && typeof agent.enabled === 'boolean' && typeof agent.createdAt === 'string' && Array.isArray(agent.toolIds)
}

export function isValidMemory(value: unknown): value is Memory {
  if (!value || typeof value !== 'object') return false
  const memory = value as Partial<Memory>
  return typeof memory.id === 'string' && typeof memory.agentId === 'string' && typeof memory.content === 'string' && typeof memory.kind === 'string' && typeof memory.createdAt === 'string' && typeof memory.pinned === 'boolean'
}

export function isValidIntegration(value: unknown): value is Integration {
  if (!value || typeof value !== 'object') return false
  const tool = value as Partial<Integration>
  if (typeof tool.id !== 'string' || typeof tool.name !== 'string' || typeof tool.description !== 'string' || typeof tool.url !== 'string' || !['GET', 'POST'].includes(tool.method as string) || typeof tool.bodyTemplate !== 'string' || typeof tool.enabled !== 'boolean' || (tool.requireApproval !== undefined && typeof tool.requireApproval !== 'boolean') || !tool.headers || typeof tool.headers !== 'object' || Array.isArray(tool.headers)) return false
  try { const url = new URL(tool.url); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}

export function isValidRun(value: unknown): value is AgentRun {
  if (!value || typeof value !== 'object') return false
  const run = value as Partial<AgentRun>
  return typeof run.id === 'string' && typeof run.agentId === 'string' && typeof run.goal === 'string' && typeof run.output === 'string' && typeof run.status === 'string' && typeof run.createdAt === 'string' && Array.isArray(run.steps) && (run.suggestedMemory === undefined || typeof run.suggestedMemory === 'string') && (run.memoryReview === undefined || ['pending', 'saved', 'dismissed'].includes(run.memoryReview))
}

export function isValidWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<Workspace>
  if (!Array.isArray(data.agents) || !Array.isArray(data.memories) || !Array.isArray(data.integrations) || !Array.isArray(data.runs) || !data.settings) return false
  return data.agents.every(isValidAgent) &&
    data.memories.every(isValidMemory) &&
    data.integrations.every(isValidIntegration) &&
    data.runs.every(isValidRun) &&
    ['openai', 'openrouter', 'custom'].includes(data.settings.provider) && typeof data.settings.endpoint === 'string' && typeof data.settings.model === 'string'
}

/** A single unrecognised record must not cost the user their whole workspace.
 * Salvage every record that still validates, fall back per-section to the starter values,
 * and keep the untouched payload in RECOVERY_KEY so nothing is destroyed.
 */
export function salvageWorkspace(value: unknown): { workspace: Workspace; dropped: number } | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Partial<Workspace>
  const salvage = <T>(candidate: unknown, valid: (item: unknown) => item is T): { kept: T[]; dropped: number } => {
    if (!Array.isArray(candidate)) return { kept: [], dropped: 0 }
    const kept = candidate.filter(valid)
    return { kept, dropped: candidate.length - kept.length }
  }
  const agents = salvage(data.agents, isValidAgent)
  const memories = salvage(data.memories, isValidMemory)
  const integrations = salvage(data.integrations, isValidIntegration)
  const runs = salvage(data.runs, isValidRun)
  const dropped = agents.dropped + memories.dropped + integrations.dropped + runs.dropped
  const settings = data.settings
  const usableSettings = settings && ['openai', 'openrouter', 'custom'].includes(settings.provider) && typeof settings.endpoint === 'string' && typeof settings.model === 'string'
  const missingSection = [data.agents, data.memories, data.integrations, data.runs].some(candidate => !Array.isArray(candidate))
  if (dropped === 0 && !missingSection && usableSettings) return null // Already fully valid; caller keeps the strict path.
  const starter = initialWorkspace()
  return {
    workspace: {
      agents: agents.kept.length || agents.dropped === 0 ? agents.kept : starter.agents,
      memories: memories.kept.length || memories.dropped === 0 ? memories.kept : starter.memories,
      integrations: integrations.kept.length || integrations.dropped === 0 ? integrations.kept : starter.integrations,
      runs: runs.kept.length || runs.dropped === 0 ? runs.kept : starter.runs,
      settings: usableSettings ? settings : starter.settings,
      dismissedWelcome: typeof data.dismissedWelcome === 'boolean' ? data.dismissedWelcome : false,
    },
    dropped,
  }
}

/** The raw text of a rejected or partially salvaged payload, kept so the user can still export it. */
export function readRecoveryBackup(): string | null {
  try { return localStorage.getItem(RECOVERY_KEY) } catch { return null }
}

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data: unknown = JSON.parse(raw)
      if (isValidWorkspace(data)) return { ...data, dismissedWelcome: data.dismissedWelcome ?? false }
      // Remember exactly what was stored before anything can overwrite it, then salvage what still parses.
      try { if (!localStorage.getItem(RECOVERY_KEY)) localStorage.setItem(RECOVERY_KEY, raw) } catch { /* Read-only storage; the original key is still intact. */ }
      const salvaged = salvageWorkspace(data)
      if (salvaged && (salvaged.workspace.agents.length || salvaged.workspace.memories.length || salvaged.workspace.runs.length)) return salvaged.workspace
    }
  } catch { /* Fall back to starter workspace if local storage is unavailable. */ }
  return initialWorkspace()
}

export function saveWorkspace(data: Workspace): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true }
  catch { return false /* Private browsing or a full device may prevent persistence. */ }
}

export function getAIKey(): string {
  try { return sessionStorage.getItem(KEY_STORAGE) ?? '' } catch { return '' }
}

export function saveAIKey(key: string) {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key)
    else sessionStorage.removeItem(KEY_STORAGE)
  } catch { /* Key remains available in component state for this page. */ }
}

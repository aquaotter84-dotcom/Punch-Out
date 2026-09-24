export type Page = 'overview' | 'agents' | 'memory' | 'integrations' | 'activity' | 'settings'
export type AgentColor = 'lavender' | 'mint' | 'peach' | 'blue' | 'yellow'
export type AgentIcon = 'sparkles' | 'search' | 'pen' | 'radar' | 'code' | 'mail'
export type Schedule = 'manual' | 'hourly' | 'daily'

export interface Agent {
  id: string
  name: string
  role: string
  description: string
  instructions: string
  icon: AgentIcon
  color: AgentColor
  schedule: Schedule
  recurringGoal: string
  enabled: boolean
  toolIds: string[]
  createdAt: string
  lastRunAt?: string
}

export interface Memory {
  id: string
  agentId: string
  content: string
  kind: 'fact' | 'preference' | 'insight'
  pinned: boolean
  source: 'manual' | 'run' | 'sample'
  createdAt: string
}

export interface Integration {
  id: string
  name: string
  description: string
  icon: 'globe' | 'search' | 'webhook' | 'slack' | 'database'
  url: string
  method: 'GET' | 'POST'
  headers: Record<string, string>
  bodyTemplate: string
  enabled: boolean
  /** POST tools ask before use by default. Existing tools without this flag use that default. */
  requireApproval?: boolean
  createdAt: string
}

export interface RunStep {
  id: string
  label: string
  detail?: string
  status: 'done' | 'error'
  createdAt: string
}

export interface AgentRun {
  id: string
  agentId: string
  goal: string
  output: string
  status: 'completed' | 'failed' | 'running' | 'preview'
  steps: RunStep[]
  createdAt: string
  source: 'manual' | 'schedule' | 'sample'
  /** A proposed memory is never used as context until the user explicitly saves it. */
  suggestedMemory?: string
  memoryReview?: 'pending' | 'saved' | 'dismissed'
}

export interface AISettings {
  provider: 'openai' | 'openrouter' | 'custom'
  endpoint: string
  model: string
}

export interface Workspace {
  agents: Agent[]
  memories: Memory[]
  integrations: Integration[]
  runs: AgentRun[]
  settings: AISettings
  dismissedWelcome: boolean
}

export const newId = () => crypto.randomUUID()

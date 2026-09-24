import { describe, expect, it } from 'vitest'
import { backgroundSnapshot, mergeBackgroundRuns } from '../background'
import { initialWorkspace } from '../storage'
import type { AgentRun } from '../types'

describe('Android background data handoff', () => {
  it('shares only approved memories and scheduling details, never tool credentials or suggestions', () => {
    const workspace = initialWorkspace()
    workspace.integrations.push({ id: 'hook', name: 'Hook', icon: 'webhook', description: 'Send data', url: 'https://example.com', method: 'POST', headers: { Authorization: 'Bearer private-tool-secret' }, bodyTemplate: 'secret-tool-body', enabled: true, createdAt: new Date().toISOString() })
    workspace.runs.unshift({ id: 'run', agentId: 'atlas', goal: 'Task', output: 'private-run-output', status: 'completed', source: 'manual', createdAt: new Date().toISOString(), steps: [], memoryReview: 'pending', suggestedMemory: 'pending-private-suggestion' })
    const snapshot = backgroundSnapshot(workspace)
    expect(snapshot).toContain('Prioritize trustworthy sources')
    expect(snapshot).not.toContain('private-tool-secret')
    expect(snapshot).not.toContain('secret-tool-body')
    expect(snapshot).not.toContain('pending-private-suggestion')
    expect(snapshot).not.toContain('private-run-output')
    expect(JSON.parse(snapshot).agents).toHaveLength(3)
  })

  it('imports native results once and updates the last-run time', () => {
    const workspace = initialWorkspace()
    const started = new Date().toISOString()
    const run: AgentRun = { id: 'native-1', agentId: 'atlas', goal: 'Summarize my plan', output: 'Start with the first step.', status: 'completed', source: 'schedule', createdAt: started, steps: [], suggestedMemory: 'Plan is ready.', memoryReview: 'pending' }
    const merged = mergeBackgroundRuns(workspace, [run, { ...run, id: 'orphan', agentId: 'missing' }, { broken: true }])
    expect(merged.runs[0]).toEqual(run)
    expect(merged.agents.find(agent => agent.id === 'atlas')?.lastRunAt).toBe(started)
    expect(merged.memories).toHaveLength(workspace.memories.length)
    expect(mergeBackgroundRuns(merged, [run])).toBe(merged)
  })
})

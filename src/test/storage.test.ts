import { describe, expect, it } from 'vitest'
import { initialWorkspace, isValidWorkspace, loadWorkspace, readRecoveryBackup, saveWorkspace, salvageWorkspace } from '../storage'

const STORAGE_KEY = 'orbit-workspace-v1'

/** A real saved workspace, then damaged the way a partial write or an older version would damage it. */
function storedWorkspace(mutate: (workspace: ReturnType<typeof initialWorkspace>) => void) {
  const workspace = initialWorkspace()
  workspace.agents.push({
    id: 'keeper', name: 'Keeper', role: 'Archivist', description: 'Keeps the long record.',
    instructions: 'Never lose anything.', icon: 'code', color: 'blue', schedule: 'daily',
    recurringGoal: 'Summarise the week', enabled: true, toolIds: [], createdAt: new Date().toISOString(),
  })
  workspace.memories.push({
    id: 'mem-keeper', agentId: 'keeper', content: 'The user writes at night.', kind: 'insight',
    pinned: true, source: 'manual', createdAt: new Date().toISOString(),
  })
  mutate(workspace)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  return workspace
}

describe('workspace persistence', () => {
  it('loads a fully valid workspace without touching the recovery backup', () => {
    storedWorkspace(() => {})
    const loaded = loadWorkspace()
    expect(loaded.agents.map(agent => agent.id)).toContain('keeper')
    expect(readRecoveryBackup()).toBeNull()
  })

  it('keeps the agents and memories when a single run record is damaged', () => {
    storedWorkspace(workspace => { (workspace.runs as unknown[]).push({ id: 'broken' }) })
    const loaded = loadWorkspace()
    // Regression: a single invalid record used to discard the entire workspace and show the starter data.
    expect(loaded.agents.map(agent => agent.id)).toContain('keeper')
    expect(loaded.memories.map(memory => memory.id)).toContain('mem-keeper')
    expect(loaded.runs.some(run => run.id === 'broken')).toBe(false)
  })

  it('keeps the user workspace when an older payload has no integrations array', () => {
    storedWorkspace(workspace => { delete (workspace as Partial<typeof workspace>).integrations })
    const loaded = loadWorkspace()
    expect(loaded.agents.map(agent => agent.id)).toContain('keeper')
    expect(loaded.integrations).toEqual([])
  })

  it('preserves the original payload for recovery instead of letting the next save destroy it', () => {
    const stored = storedWorkspace(workspace => { (workspace.runs as unknown[]).push({ id: 'broken' }) })
    loadWorkspace()
    const backup = readRecoveryBackup()
    expect(backup).not.toBeNull()
    expect(JSON.parse(backup as string).agents).toHaveLength(stored.agents.length)
    // The auto-save that follows a load must not be able to overwrite the only copy of the damaged records.
    saveWorkspace(loadWorkspace())
    expect(JSON.parse(readRecoveryBackup() as string).agents).toHaveLength(stored.agents.length)
  })

  it('falls back to the starter workspace when nothing in the payload validates', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ agents: 'nope', memories: 3 }))
    const loaded = loadWorkspace()
    expect(isValidWorkspace(loaded)).toBe(true)
    expect(loaded.agents).toHaveLength(3)
  })

  it('reports how many records could not be salvaged', () => {
    const salvaged = salvageWorkspace({ ...initialWorkspace(), runs: [{ id: 'broken' }] })
    expect(salvaged?.dropped).toBe(1)
    expect(salvaged?.workspace.agents).toHaveLength(3)
  })
})

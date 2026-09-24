import type { AgentRun } from './types'

/** A draft only. It must be reviewed before it becomes agent context. */
export function suggestMemory(goal: string, output: string): string {
  const shortGoal = goal.trim().replace(/\s+/g, ' ').slice(0, 160)
  const summary = output
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280)
  return `Previously worked on: ${shortGoal}. Key result: ${summary}${output.length > 280 ? '…' : ''}`
}

export function needsMemoryReview(run: AgentRun): boolean {
  return run.status === 'completed' && run.memoryReview === 'pending' && Boolean(run.suggestedMemory)
}

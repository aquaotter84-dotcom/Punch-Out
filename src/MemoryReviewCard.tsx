import { useState } from 'react'
import { ArrowRight, Brain, Check, X } from 'lucide-react'
import { useOrbit } from './context'
import { AgentAvatar } from './ui'
import type { AgentRun } from './types'

export function MemoryReviewCard({ run, compact = false }: { run: AgentRun; compact?: boolean }) {
  const { workspace, reviewMemory } = useOrbit()
  const agent = workspace.agents.find(item => item.id === run.agentId)
  const [draft, setDraft] = useState(run.suggestedMemory ?? '')
  if (!agent || run.memoryReview !== 'pending') return null

  return <div className={`memory-review-card ${compact ? 'memory-review-card--compact' : ''}`}>
    <div className="memory-review-top"><span className="memory-review-icon"><Brain size={20} /></span><div><strong>Worth remembering?</strong><small>{agent.name} will only use this if you save it.</small></div><span className="memory-review-badge">YOUR CHOICE</span></div>
    {compact && <div className="memory-review-agent"><AgentAvatar agent={agent} size="tiny" /><span>{agent.name} · {run.goal}</span></div>}
    <label className="field"><span>Review or edit this suggestion</span><textarea rows={compact ? 3 : 4} value={draft} onChange={event => setDraft(event.target.value)} aria-label={`Suggested memory for ${agent.name}`} /></label>
    <div className="memory-review-actions"><p>Only saved memories become part of future runs.</p><button className="memory-review-dismiss" onClick={() => reviewMemory(run.id, 'dismiss')}><X size={15} /> Don't save</button><button className="button button--dark button--small" disabled={!draft.trim()} onClick={() => reviewMemory(run.id, 'save', draft)}><Check size={15} /> Save memory <ArrowRight size={15} /></button></div>
  </div>
}
